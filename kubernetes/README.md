# Postrix Kubernetes

We manage everything in the cluster in the kubernetes directory.
Anything managed outside the cluster, such as node machine type, cluster settings, is managed by Terraform.

# Deploy comands
All deploy commands require an --environment argument
If the namespace is not specified it will just use the environment name

Deploy core service local: `helmfile sync --file core/helmfile.yaml --environment=local`
Deploy core service dev: `helmfile sync --file core/helmfile.yaml --environment=dev`
Deploy core service dev(namespace test): `helmfile sync --file core/helmfile.yaml --environment=dev --namespace=test`
Deploy core service local: `helmfile sync --file core/helmfile.yaml --environment=dev`

# View service locally on browser
You might want to view you service locally on the browser

View core service local: `minikube service core --namespace=local`