# Postrix Terraform

# Secrets Terraform Cloud

We don't want to store secrets in our repo, so we set them in the UI and then import them to terraform.

# Github Secrets

Run this command to encrypt your github secret using the repo public token:

```
node -e 'const s=require("tweetnacl-sealedbox-js"),p=process.argv[1],v=process.argv[2];if(p&&v)console.log(Buffer.from(s.seal(Buffer.from(v),Buffer.from(p,"base64"))).toString("base64"));' 'TFntFYu2dknn/I1Oh2WY+9dosJRUh6omguYzq/Sg+zA=' 'my_secret'
```

You need to one time install the package "tweetnacl-sealedbox-js" globally:

```
npm install -g "tweetnacl-sealedbox-js"
```

# Github Projects

I failed to find a way to create/import a github project via terraform, so we will manage them manually.

# Import example

```
terraform import module.aws_credentials.aws_iam_access_key.postrix <resource_id>
```

# Renaming Terraform Modules

Terraform doesn't support renaming modules, so we need to move the module to the new name and then run `terraform state mv` to update the state.

Example:
```
terraform state mv module.github_general module.github
```
