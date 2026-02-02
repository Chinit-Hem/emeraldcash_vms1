export type Role = "Admin" | "Staff";

export type User = {
  username: string;
  role: Role;
};

export type Vehicle = {
  VehicleId: string;
  Category: string;
  Brand: string;
  Model: string;
  Year: number | null;
  Plate: string;
  PriceNew: number | null;
  Price40: number | null;
  Price70: number | null;
  TaxType: string;
  Condition: string;
  BodyType: string;
  Color: string;
  Image: string;
  Time: string;
  Fast: boolean;
  _deleted?: boolean;
};
