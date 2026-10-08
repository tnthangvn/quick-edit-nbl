#!/usr/bin/env bash
# Spec Studio — cài đặt môi trường dev trên máy mới bằng một lệnh:
#   ./setup.sh
#
# Script chạy lại nhiều lần vẫn an toàn (idempotent):
#   1. Kiểm tra công cụ hệ thống (git, curl, trình biên dịch cho native module)
#   2. Cài nvm nếu chưa có, cài Node theo .nvmrc (LTS)
#   3. Bật corepack, cài đúng bản pnpm theo "packageManager" trong package.json
#   4. pnpm install
#   5. Tạo thư mục dữ liệu ~/.spec-studio (quyền 700) và .env.local
#   6. Chạy migration (chỉ khi DATA_DRIVER=POSTGRES), sinh docs/api.json + client API
#   7. Kiểm tra các CLI tuỳ chọn (gh, glab, claude, codex, agy, aider, nlm)
#
# Tuỳ chọn:
#   --skip-optional   bỏ qua bước kiểm tra CLI tuỳ chọn
#   -h, --help        hiện hướng dẫn

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

NVM_VERSION="v0.40.8"
SPEC_STUDIO_HOME="${SPEC_STUDIO_HOME:-$HOME/.spec-studio}"
SKIP_OPTIONAL=0

for arg in "$@"; do
  case "$arg" in
    --skip-optional) SKIP_OPTIONAL=1 ;;
    -h | --help)
      sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Tham số không hợp lệ: $arg" >&2
      exit 2
      ;;
  esac
done

# ---------- output ----------
if [[ -t 1 ]]; then
  BOLD=$'\033[1m' DIM=$'\033[2m' BLUE=$'\033[34m' GREEN=$'\033[32m' YELLOW=$'\033[33m' RED=$'\033[31m' RESET=$'\033[0m'
else
  BOLD="" DIM="" BLUE="" GREEN="" YELLOW="" RED="" RESET=""
fi

step() { printf '\n%s==>%s %s%s%s\n' "$BLUE" "$RESET" "$BOLD" "$*" "$RESET"; }
ok() { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
fail() {
  printf '  %s✗%s %s\n' "$RED" "$RESET" "$*" >&2
  exit 1
}
has() { command -v "$1" >/dev/null 2>&1; }

# ---------- 1. công cụ hệ thống ----------
step "Kiểm tra công cụ hệ thống"

OS="$(uname -s)"
case "$OS" in
  Linux | Darwin) ok "Hệ điều hành: $OS" ;;
  *) fail "Chưa hỗ trợ $OS. Dùng Linux, macOS hoặc WSL2." ;;
esac

for tool in git curl; do
  has "$tool" || fail "Thiếu $tool. Cài $tool rồi chạy lại ./setup.sh"
  ok "$tool"
done

# Native module thường có bản build sẵn; thiếu thì mới cần tự biên dịch.
missing_build=()
for tool in python3 make; do has "$tool" || missing_build+=("$tool"); done
has g++ || has clang++ || missing_build+=("g++/clang++")
if ((${#missing_build[@]})); then
  warn "Thiếu ${missing_build[*]} (chỉ cần khi native module phải tự biên dịch)."
  if [[ "$OS" == "Darwin" ]]; then
    warn "Cài bằng: xcode-select --install"
  else
    warn "Cài bằng: sudo apt install -y build-essential python3"
  fi
else
  ok "Bộ biên dịch (python3, make, g++/clang++)"
fi

# ---------- 2. Node qua nvm ----------
step "Cài Node.js theo .nvmrc"

[[ -f .nvmrc ]] || fail "Không tìm thấy .nvmrc trong $ROOT_DIR"
NODE_WANTED="$(tr -d '[:space:]' <.nvmrc)"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  warn "Chưa có nvm, đang cài nvm $NVM_VERSION"
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh" | PROFILE=/dev/null bash
fi
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
ok "nvm $(nvm --version)"

nvm install "$NODE_WANTED" >/dev/null
nvm use "$NODE_WANTED" >/dev/null
ok "Node $(node -v) (yêu cầu: $NODE_WANTED)"

# ---------- 3. pnpm qua corepack ----------
step "Cài pnpm qua corepack"

has corepack || npm install -g corepack >/dev/null
corepack enable

if [[ -f package.json ]]; then
  PNPM_SPEC="$(node -p "require('./package.json').packageManager || ''")"
  [[ "$PNPM_SPEC" == pnpm@* ]] || fail "package.json thiếu \"packageManager\": \"pnpm@<version>\""
  PNPM_VERSION="${PNPM_SPEC#pnpm@}"
  PNPM_VERSION="${PNPM_VERSION%%+*}"

  # Cache corepack hỏng (thiếu bin/pnpm.cjs) → xoá đúng bản đó rồi tải lại.
  if ! corepack pnpm --version >/dev/null 2>&1; then
    COREPACK_CACHE="${COREPACK_HOME:-$HOME/.cache/node/corepack}"
    warn "pnpm $PNPM_VERSION trong cache corepack bị hỏng, đang tải lại"
    rm -rf "$COREPACK_CACHE/v1/pnpm/$PNPM_VERSION"
  fi
  corepack install >/dev/null
  ok "pnpm $(corepack pnpm --version)"
else
  warn "Chưa có package.json (project chưa được khởi tạo), bỏ qua pnpm và các bước sau"
fi

# ---------- 4. dependencies ----------
if [[ -f package.json ]]; then
  step "Cài dependencies"
  if [[ -f pnpm-lock.yaml ]]; then
    corepack pnpm install --frozen-lockfile
  else
    corepack pnpm install
  fi
  ok "pnpm install xong"
fi

# ---------- 5. thư mục dữ liệu + env ----------
step "Chuẩn bị thư mục dữ liệu và biến môi trường"

mkdir -p "$SPEC_STUDIO_HOME/data"
chmod 700 "$SPEC_STUDIO_HOME"
ok "Thư mục dữ liệu: $SPEC_STUDIO_HOME"

if [[ -f .env.example && ! -f .env.local ]]; then
  cp .env.example .env.local
  ok "Đã tạo .env.local từ .env.example (điền GOOGLE_CLIENT_ID/SECRET nếu dùng Drive)"
elif [[ -f .env.local ]]; then
  ok ".env.local đã có, giữ nguyên"
else
  warn "Chưa có .env.example, bỏ qua"
fi

# ---------- 6. DB + OpenAPI ----------
if [[ -f package.json ]]; then
  step "Migration và sinh API"
  DATA_DRIVER_VALUE="$(grep -E '^DATA_DRIVER=' .env.local 2>/dev/null | cut -d= -f2 | tr -d '"[:space:]' || true)"
  if [[ "${DATA_DRIVER_VALUE:-JSON}" == "POSTGRES" ]]; then
    has docker || fail "DATA_DRIVER=POSTGRES cần Docker để chạy Postgres dev (hoặc trỏ DATABASE_URL tới Postgres có sẵn)"
    make --no-print-directory db-up
    ok "Postgres dev đã chạy"
  else
    ok "DATA_DRIVER=JSON, dữ liệu lưu trong ${SPEC_STUDIO_HOME}/data"
  fi
  make --no-print-directory migrate
  ok "Migration xong"
  make --no-print-directory api
  ok "Đã sinh docs/api.json và src/client/api/generated"
fi

# ---------- 7. CLI tuỳ chọn ----------
if ((SKIP_OPTIONAL == 0)); then
  step "Kiểm tra CLI tuỳ chọn (không bắt buộc)"
  check_optional() {
    local bin="$1" purpose="$2" hint="$3"
    if has "$bin"; then
      ok "$bin ${DIM}— $purpose${RESET}"
    else
      warn "$bin chưa cài ${DIM}— $purpose. Cài: $hint${RESET}"
    fi
  }
  check_optional gh "Git connector GitHub" "https://cli.github.com"
  check_optional glab "Git connector GitLab" "https://gitlab.com/gitlab-org/cli"
  check_optional claude "CLI agent Claude Code" "npm i -g @anthropic-ai/claude-code"
  check_optional codex "CLI agent Codex (ChatGPT)" "npm i -g @openai/codex"
  check_optional agy "CLI agent Antigravity" "https://antigravity.google"
  check_optional aider "CLI agent Aider" "pipx install aider-chat"
  check_optional nlm "NotebookLM sync" "uv tool install notebooklm-mcp-cli"
fi

# ---------- xong ----------
step "Hoàn tất"
cat <<EOF
  Mở terminal mới (hoặc chạy: ${BOLD}nvm use${RESET}) rồi:

    ${BOLD}make dev${RESET}      chạy app ở http://localhost:3000
    ${BOLD}make help${RESET}     xem toàn bộ lệnh
EOF
