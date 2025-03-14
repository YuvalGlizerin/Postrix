Steps to create a whatsapp api phone number:

1) Buy a phone number on twilio
2) Set up a new sender on twilio
Note: Do not continue with facebook, only make sure you get to the page(Verify the selected number with WhatsApp),
to receive the verification code. All the next steps should be from whatsapp manager
3) Optional - Create a facebook business portfolio if you do not have one already for your phone number in business.facebook.com
4) Connect a phone number together with its whatsapp account in developers.facebook.com
5) Add a payment method in developers.facebook.com
6) Optional - Configure a webhook if you have not already in developers.facebook.com
7) Set up Two-step verification for your phone number in business.facebook.com/latest/whatsapp_manager/phone_numbers
8) Create a system user and assign all assets to it in business.facebook.com/latest/settings/system_users
9) Generate and get a token for the system user you just created in business.facebook.com/latest/settings/system_users
10) Get your phone number id in developers.facebook.com
11) Register your phone number
curl -X POST \
  "https://graph.facebook.com/v17.0/$PHONE_ID$/register" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "pin": "$PIN_CODE_FROM_TWO_STEP_VERIFICATION"
  }'
12) Subscribe your app to the phone number like this(https://stackoverflow.com/a/79235226):
curl -X POST \
'https://graph.facebook.com/v22.0/$WHATSAPP_ACCOUNT_ID$/subscribed_apps' \
-H 'Authorization: Bearer $ACCESS_TOKEN'
13) Send a whatsapp message to your new whatsapp phone number
14) Send a response to see if it works:
curl -X POST \
  "https://graph.facebook.com/v22.0/$PHONE_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "$PHONE_NUMBER_TO_SEND_MESSAGE_TO$",
    "type": "text",
    "text": {
      "body": "Hello World!"
    }
  }'