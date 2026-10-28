import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class GraphAttentionLayer(nn.Module):
    """
    Single-head Graph Attention Network (GAT) Layer.
    Computes self-attention between graph nodes (EVs, Charging Stations, Road Intersections, Parking Spots).
    """
    def __init__(self, in_features: int, out_features: int, dropout: float = 0.1, alpha: float = 0.2):
        super(GraphAttentionLayer, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.dropout = dropout
        self.alpha = alpha

        # Linear transformation matrix
        self.W = nn.Parameter(torch.empty(size=(in_features, out_features)))
        nn.init.xavier_uniform_(self.W.data, gain=1.414)

        # Attention parameter matrix
        self.a = nn.Parameter(torch.empty(size=(2 * out_features, 1)))
        nn.init.xavier_uniform_(self.a.data, gain=1.414)

        self.leakyrelu = nn.LeakyReLU(self.alpha)

    def forward(self, h: torch.Tensor, adj: torch.Tensor):
        """
        h: [N, in_features] node features matrix
        adj: [N, N] adjacency matrix (1 if connected, 0 otherwise)
        """
        Wh = torch.mm(h, self.W)  # [N, out_features]
        N = Wh.size(0)

        # Self-attention mechanism: concat Wh_i and Wh_j for all pairs
        a_input = torch.cat([Wh.repeat(1, N).view(N * N, -1), Wh.repeat(N, 1)], dim=1).view(N, N, 2 * self.out_features)
        
        # Calculate raw attention scores
        e = self.leakyrelu(torch.matmul(a_input, self.a).squeeze(2)) # [N, N]

        # Mask non-adjacent nodes with a large negative value for softmax masking
        zero_vec = -9e15 * torch.ones_like(e)
        attention = torch.where(adj > 0, e, zero_vec)
        
        # Normalize with softmax
        attention = F.softmax(attention, dim=1)
        attention = F.dropout(attention, self.dropout, training=self.training)
        
        # Aggregate features
        h_prime = torch.matmul(attention, Wh) # [N, out_features]

        return F.elu(h_prime), attention

class EVGATModel(nn.Module):
    """
    Multi-Head Graph Attention Network for EV Spatial Learning.
    Input node features: [latitude, longitude, node_type, current_capacity, occupancy_rate, traffic_density]
    """
    def __init__(self, num_features: int = 6, hidden_dim: int = 16, num_classes: int = 8, num_heads: int = 2):
        super(EVGATModel, self).__init__()
        self.num_heads = num_heads
        
        self.attentions = nn.ModuleList([
            GraphAttentionLayer(num_features, hidden_dim) for _ in range(num_heads)
        ])
        
        # Output GAT layer
        self.out_att = GraphAttentionLayer(hidden_dim * num_heads, num_classes)

    def forward(self, x: torch.Tensor, adj: torch.Tensor):
        # Concatenate multi-head attention outputs
        x_heads = []
        att_weights_list = []
        for att in self.attentions:
            h, att_w = att(x, adj)
            x_heads.append(h)
            att_weights_list.append(att_w)
            
        x_cat = torch.cat(x_heads, dim=1)
        output_features, final_attention = self.out_att(x_cat, adj)
        
        return output_features, final_attention, att_weights_list[0]

def infer_gat_spatial_weights(nodes_data, adj_matrix):
    """
    Helper function to run PyTorch GAT inference over dynamic spatial graph data.
    nodes_data: list of dicts with node properties
    """
    num_nodes = len(nodes_data)
    if num_nodes == 0:
        return [], []

    features = []
    for n in nodes_data:
        # Extract normalized feature vector
        feat = [
            float(n.get('lat', 0.0)) / 90.0,
            float(n.get('lng', 0.0)) / 180.0,
            float(n.get('node_type_id', 0)), # 0: EV, 1: Station, 2: Parking, 3: Junction
            float(n.get('capacity', 10)) / 50.0,
            float(n.get('occupancy', 0.5)),
            float(n.get('traffic_score', 0.3))
        ]
        features.append(feat)

    x_tensor = torch.tensor(features, dtype=torch.float32)
    adj_tensor = torch.tensor(adj_matrix, dtype=torch.float32)

    model = EVGATModel(num_features=6, hidden_dim=8, num_classes=4, num_heads=2)
    model.eval()

    with torch.no_grad():
        out_emb, final_att, head_att = model(x_tensor, adj_tensor)

    # Convert attention weights matrix to python list
    attention_matrix = head_att.numpy().tolist()
    embeddings = out_emb.numpy().tolist()

    return attention_matrix, embeddings
