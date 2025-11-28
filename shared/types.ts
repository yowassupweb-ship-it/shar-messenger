export interface Variable {
  name: string;
  value: string;
  description?: string;
}

export interface FeedTemplate {
  id?: string;
  name: string;
  description?: string;
  template: string;
  variables: Variable[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  image_url?: string;
  attributes: Record<string, any>;
}