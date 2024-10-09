# Postrix Kubernetes

We manage everything in the cluster in the kubernetes directory.
Anything managed outside the cluster, such as node machine type, cluster settings, is managed by Terraform.

# Create namespace
Before running any deploy commands, you need to create the namespace, examples:
Create namespace local: `kubectl create namespace local`
Create namespace dev: `kubectl create namespace dev`
Create namespace prod: `kubectl create namespace prod`

# Deploy comands
All deploy commands should have a --namespace argument
If the namespace is not specified it will just use the default namespace "default"

Deploy core service local: `kubectl apply -f kubernetes/core/local/ --namespace=local`
Deploy core service dev: `kubectl apply -f kubernetes/core/dev/ --namespace=dev`
Deploy core service local: `kubectl apply -f kubernetes/core/prod/ --namespace=prod`

# View service locally on browser
You might want to view you service locally on the browser

View core service local: `minikube service core --namespace=local`