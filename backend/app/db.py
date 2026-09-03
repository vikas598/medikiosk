from supabase import create_client
from app.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# try:
#     response = supabase.table("patients").select("*").limit(1).execute()
#     print("✅ Supabase connected successfully!")
#     print(response.data)
# except Exception as e:
#     print("❌ Supabase connection failed:")
#     print(e)
