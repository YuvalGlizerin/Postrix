# Postrix Kubernetes
We manage everything in the cluster in the kubernetes directory.
Anything managed outside the cluster, such as node machine type, cluster settings, is managed by Terraform.

# Local development
- Install minikube
- Install kubectl
- Install helm
- Install helmfile
- (Optional)Follow guide to expose services on local browser with custom urls and without `minikube service`: https://minikube.sigs.k8s.io/docs/handbook/addons/ingress-dns/#Linux

# Deploy comands
All helmfile sync commands should have a --environment argument
Please note that helmfile sync will not uninstall charts that were removed from helmfile.yaml.
This is to prevent accidental deletion of services, so to uninstall a chart, you need to run `helm uninstall <old-chart-name>`
Also you should check .github/workflows/deploy.yml to get the most updated helmfile sync command to deploy releases properly.

Deploy services local(Will only work on local): `helmfile sync -f helmfile.yaml --environment=local -l group=app`
Deploy services dev(Will not work on local): `helmfile sync -f helmfile.yaml --environment=dev -l group=app`
Deploy services prod(Will not work on local): `helmfile sync -f helmfile.yaml --environment=prod -l group=app`

You might also only want to sync a single service, for example: `helmfile sync -f helmfile.yaml --environment=local -l app=joby`

# View service locally on browser
You might want to view you service locally on the browser

View all services local(Defined ports): `minikube tunnel`
View joby service local(Random port): `minikube service joby --namespace=local`