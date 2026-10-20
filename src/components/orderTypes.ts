export type OrderSelection = {
  id: string;
  name: string;
  nameAmharic: string;
  price: number;
  size?: string;
};

export type CartLine = OrderSelection & {
  quantity: number;
};
