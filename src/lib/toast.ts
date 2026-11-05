// Simple toast system pour les notifications
export function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) {
  // Dans une app réelle, utiliser une librairie comme sonner/toaster
  // Pour maintenant, on log juste en console (sera visible dans la console du navigateur)
  const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  console.log(`${emoji} ${message}`);
}
