# Postrix Terraform

# Manual Infrastruce
Although I tried my best to make sure all my infrastruce is set via terraform there are some infrastructure which I had to set manually:
1) Create a service-account and add it the necessary permissions for all your projects
2) Add your service account as an owner to your verified domain in webmaster: https://medium.com/@bitniftee/flash-tutorial-fix-cloud-run-domain-mapping-verification-issues-4dba51151578
3) terraform import doesn't work with terraform cloud, make sure to call `API_KEY=secret1 API_KEY2=secret2 terraform import ...` command with the secrets passed via the terminal if an import is needed