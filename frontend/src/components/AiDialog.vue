<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card class="ai-dialog" style="min-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">
          <q-icon name="smart_toy" color="primary" /> {{ title }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <div class="ai-response" v-if="response">
          {{ response }}
        </div>
        <div v-else-if="loading" class="text-center">
          <q-spinner-dots color="primary" size="40px" />
          <div class="text-caption q-mt-sm">{{ $t('msg.generatingText') }}</div>
        </div>
        <div v-else class="text-center">
          <q-spinner-dots color="primary" size="40px" />
          <div class="text-caption q-mt-sm">{{ $t('msg.generatingText') }}</div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          :label="$t('btn.cancel')"
          color="primary"
          v-close-popup
        />
        <q-btn
          :disable="!response"
          flat
          :label="$t('btn.apply')"
          color="primary"
          @click="onOKClick"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { useDialogPluginComponent } from 'quasar';
import { generateResponse } from 'src/services/ai';

export default {
  name: 'AiDialog',

  props: {
    title: {
      type: String,
      required: true
    },
    task: {
      type: String,
      required: true
    },
    prompt: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: ''
    }
  },

  emits: [
    ...useDialogPluginComponent.emits
  ],

  data() {
    return {
      response: '',
      error: null,
      loading: false
    }
  },

  setup() {
    return {
      ...useDialogPluginComponent()
    }
  },

  methods: {
    show() {
      this.$refs.dialogRef.show()
      this.generateResponse()
    },
    hide() {
      this.$refs.dialogRef.hide()
    },
    onDialogHide() {
      this.response = ''
      this.error = null
      this.loading = false
      this.$emit('hide')
    },
    onOKClick() {
      this.$emit('ok', this.response)
      this.$refs.dialogRef.hide()
    },
    async generateResponse() {
      try {
        this.loading = true
        console.log('sending prompt to ia:', {
          task: this.task,
          prompt: this.prompt,
          text: this.text
        });

        this.response = await generateResponse(this.task, this.prompt, this.text);
      } catch (err) {
        this.error = err.message;
        this.$q.notify({
          type: 'negative',
          message: err.message,
          position: 'top'
        });
        this.hide();
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss">
.ai-dialog {
  .ai-response {
    white-space: pre-wrap;
    font-family: monospace;
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
