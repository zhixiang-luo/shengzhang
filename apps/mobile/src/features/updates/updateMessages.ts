export function toUpdateFailureMessage(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  const normalized = detail.toLowerCase();

  if (
    normalized.includes('timed out') ||
    normalized.includes('timeout') ||
    normalized.includes('abort')
  ) {
    return '网络连接超时。请稍后重试；如果持续失败，请从官网覆盖安装最新版。';
  }

  if (
    normalized.includes('runtime') ||
    normalized.includes('compatible') ||
    normalized.includes('channel')
  ) {
    return '当前安装包与更新通道不兼容，请从官网覆盖安装最新版。账本会保留。';
  }

  return '检查更新失败。请确认网络正常后重试；如果仍失败，请从官网覆盖安装最新版。';
}
