#!/usr/bin/env bash
# Tạo chứng chỉ HTTPS tự ký cho `npm run dev:https` (webcam LAN).
# Gồm localhost + mọi IPv4 đang có trên máy. Máy khác vẫn phải bấm
# "Advanced → Proceed" vì đây là cert tự ký (không phải lỗi cấu hình).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CERT_DIR="$ROOT/certs"
KEY="$CERT_DIR/dev-key.pem"
CERT="$CERT_DIR/dev-cert.pem"
CFG="$(mktemp)"
trap 'rm -f "$CFG"' EXIT

mkdir -p "$CERT_DIR"

IPS=()
while IFS= read -r ip; do
  [[ -n "$ip" ]] && IPS+=("$ip")
done < <(
  if command -v ipconfig >/dev/null 2>&1; then
    for iface in $(ifconfig -l 2>/dev/null); do
      ipconfig getifaddr "$iface" 2>/dev/null || true
    done
  fi
  ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" { print $2 }'
  hostname -I 2>/dev/null | tr ' ' '\n' || true
)

# Luôn có loopback; bỏ trùng.
IPS=("127.0.0.1" "${IPS[@]}")
UNIQUE_IPS=()
seen=""
for ip in "${IPS[@]}"; do
  [[ "$ip" == *:* ]] && continue  # bỏ IPv6 cho đơn giản
  case " $seen " in
    *" $ip "*) ;;
    *) UNIQUE_IPS+=("$ip"); seen+=" $ip " ;;
  esac
done

{
  echo "[req]"
  echo "distinguished_name = req_dn"
  echo "x509_extensions = v3_req"
  echo "prompt = no"
  echo "[req_dn]"
  echo "CN = AI-ExamGuard-Dev"
  echo "O = AI ExamGuard"
  echo "[v3_req]"
  echo "basicConstraints = CA:FALSE"
  echo "keyUsage = digitalSignature, keyEncipherment"
  echo "extendedKeyUsage = serverAuth"
  echo "subjectAltName = @alt"
  echo "[alt]"
  echo "DNS.1 = localhost"
  echo "DNS.2 = *.local"
  i=1
  for ip in "${UNIQUE_IPS[@]}"; do
    echo "IP.$i = $ip"
    i=$((i + 1))
  done
} > "$CFG"

openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY" -out "$CERT" -days 825 \
  -config "$CFG"

echo "Đã tạo:"
echo "  $CERT"
echo "  $KEY"
echo "SAN IP:"
for ip in "${UNIQUE_IPS[@]}"; do echo "  - $ip"; done
echo
echo "Chạy: npm run dev:https"
echo "Máy khác mở: https://<IP-LAN>:3000  → Advanced → Proceed (cert tự ký)."
