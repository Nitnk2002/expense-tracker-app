export interface ExpenseDto {
  id?: number;
  external_id?: string;
  amount: string; // The backend uses a String for amount, so we must adhere to it (though we'd parse to float in UI)
  user_id?: string;
  merchant: string;
  currency: string;
  created_at?: string;
  category?: string; // Target TO-BE schema field
}

export interface UserInfoDto {
  first_name?: string;
  last_name?: string;
  username: string;
  email?: string;
  phone_number?: string;
}
