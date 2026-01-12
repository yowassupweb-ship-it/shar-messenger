export interface Cluster {
  id: string;
  name: string;
  types: ClusterType[];
}

export interface ClusterType {
  id: string;
  name: string;
}

export interface Filter {
  id: string;
  name: string;
  items: string[];
  category: string;
}

export interface Query {
  id: string;
  text: string;
  impressions?: number;
  source?: string;
  cluster?: string;
  type?: string;
}

export interface SearchModel {
  id: string;
  name: string;
  content: string;
}
