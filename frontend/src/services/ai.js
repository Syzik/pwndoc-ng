import { i18n } from 'boot/i18n';

export async function checkHealth() {
  try {
    const response = await fetch('/api/ai/health');
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.status === 'success';
  } catch (err) {
    console.error('Error checking AI health:', err);
    return false;
  }
}

export async function generateResponse(task, prompt, text) {
  try {
    // Check if AI service is available first
    const isHealthy = await checkHealth();
    if (!isHealthy) {
      throw new Error(i18n.global.t('err.aiServiceUnavailable'));
    }

    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        prompt,
        text
      })
    });

    if (!response.ok) {
      throw new Error(i18n.global.t('err.aiGenerationError'));
    }

    const data = await response.json();
    if (data.status !== 'success') {
      throw new Error(data.datas || i18n.global.t('err.aiGenerationError'));
    }
    return data.datas.response;
  } catch (err) {
    console.error('Error generating AI response:', err);
    throw err;
  }
}
