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

# How to encrypt secrets
We manage secrets using sealed-secrets, that allow you to store encrypted secrets in your git repo
Example on how to create a secret:

```bash
kubectl create secret generic elasticsearch-auth \
  --namespace elastic \
  --dry-run=client \
  --from-literal=elasticsearch-password='my-password' \
  -o yaml | \
kubeseal --format yaml \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=sealed-secrets > elasticsearch/templates/secret.yaml
```

Note: This does not create a secret in your cluster, it only creates the file
Note: You need to restart the pods after changing the secret only because it does not count as a change

# How to view secrets
Example:
```bash
kubectl get secret postgresql-auth -n postgresql -o jsonpath='{.data.postgresql-password}' | base64 -d
```
