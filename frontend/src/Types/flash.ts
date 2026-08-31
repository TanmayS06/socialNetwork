export type FlashType = "success" | "error" | "info";

export type Flash = {
  id: number;
  type: FlashType;
  message: string;
};
