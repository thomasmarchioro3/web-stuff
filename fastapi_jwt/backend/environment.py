from dotenv import load_dotenv

if load_dotenv():
   
    print("Environment variables loaded from .env")

    # print(os.environ.get("JWT_SECRET_KEY"))

else:
    raise Exception("Couldn't load environment variables from .env file")
