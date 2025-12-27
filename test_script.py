import pandas as pd
print("Loading support ticket data...")
support_tickets_df = pd.read_excel('nbh-data/3-month-27Dec/SUPPORT_TICKET_COMMENTS_STATUS_8a9696ce88922af9018895bd9d232ffc_1766800282782.xlsx')
print(f"Loaded {len(support_tickets_df)} tickets")
print(f"Columns: {list(support_tickets_df.columns)}")
print("Success!")
