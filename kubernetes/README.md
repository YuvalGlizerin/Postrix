# Postrix Kubernetes
We manage everything in the cluster in the kubernetes directory.
Anything managed outside the cluster, such as node machine type, cluster settings, is managed by Terraform.

# Deploy comands
All helmfile deploy commands should have a --environment argument

Deploy services local: `helmfile sync -f helmfile.yaml --environment=local`
Deploy services dev: `helmfile sync -f helmfile.yaml --environment=dev`
Deploy services prod: `helmfile sync -f helmfile.yaml --environment=prod`

You might also only want to sync a single service, for example: `helmfile sync -f helmfile.yaml --environment=local -l app=core`

# View service locally on browser
You might want to view you service locally on the browser

View core service local: `minikube service core --namespace=local`