# Cloudflare DNS — going live at maisonnovatio.ca

The server side is fully deployed (container on host port **3008**, Traefik route
`infra/hebergement-web/traefik/dynamic/novatio.yml` → `host.docker.internal:3008`,
verified returning 200). The **only** remaining step to make the site reachable on
the internet is DNS, done in the Cloudflare dashboard.

The internet-facing layer is the shared Cloudflare Tunnel + Traefik stack, whose
tunnel ingress is a catch-all — so **no tunnel/cloudflared change is needed**, only
DNS + the (already-added) Traefik route.

- Shared tunnel ID: `b1774fc4-f03e-48cb-89eb-0732f617667e`
- Tunnel CNAME target: `b1774fc4-f03e-48cb-89eb-0732f617667e.cfargotunnel.com`

## Steps

1. **Add the site to Cloudflare.** In the SAME Cloudflare account that owns the
   tunnel, add `maisonnovatio.ca` as a new site.

2. **Switch nameservers.** At the domain registrar, change the nameservers to the
   two Cloudflare nameservers shown during step 1. Wait for Cloudflare to report the
   zone as **Active** (can take minutes to a few hours).

3. **Add DNS records** (Cloudflare dashboard → DNS → Records):

   | Type  | Name  | Target                                                        | Proxy    |
   |-------|-------|---------------------------------------------------------------|----------|
   | CNAME | `@`   | `b1774fc4-f03e-48cb-89eb-0732f617667e.cfargotunnel.com`       | Proxied  |
   | CNAME | `www` | `b1774fc4-f03e-48cb-89eb-0732f617667e.cfargotunnel.com`       | Proxied  |

   - `@` is the apex (`maisonnovatio.ca`). A wildcard record does **not** cover the
     apex — the apex needs its own record.
   - Both must be **Proxied** (orange cloud), not DNS-only.

4. **SSL/TLS mode → Full.** Cloudflare dashboard → SSL/TLS → Overview → set
   encryption mode to **Full**. TLS terminates at Cloudflare; Traefik serves plain
   HTTP internally over the tunnel.

## Verify (after DNS propagates)

```bash
curl -I https://maisonnovatio.ca/
curl -I https://www.maisonnovatio.ca/
```

Both should return `HTTP/2 200`. If you get a 5xx from Cloudflare, the tunnel/Traefik
path is the suspect; re-check the Traefik route and that the container is up:

```bash
docker ps --filter name=nanopods-house-web
docker exec traefik wget -S -qO /dev/null --header="Host: maisonnovatio.ca" http://localhost:80/
```

## Notes

- Adding this app required **no** change to cloudflared/the tunnel (catch-all
  ingress) — only the Traefik file route (already added) + the DNS records above.
- The registrar's DNS `A`/forwarding/parking records must be gone once nameservers
  point at Cloudflare — leftover registrar "forwarding" IPs will break resolution.
