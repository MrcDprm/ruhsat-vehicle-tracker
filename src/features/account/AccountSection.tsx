import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Card } from '@/components/Card';
import { Row } from '@/components/SettingsRow';
import { Text } from '@/components/Text';
import { accountsEnabled, useSession } from '@/sync/client';
import { pendingCount, syncNow, useSyncStatus } from '@/sync/engine';
import { useI18n } from '@/i18n';

import { deleteAccount, signOut } from './actions';

/** Ayarlar > Hesap: giriş, eşitleme durumu, çıkış ve hesap silme. Hesap özelliği yapılandırılmadıysa görünmez. */
export function AccountSection() {
  const { t, date } = useI18n();
  const session = useSession();
  const sync = useSyncStatus();
  const [busy, setBusy] = useState<'sync' | 'signout' | 'delete' | null>(null);

  if (!accountsEnabled || session.status === 'loading') return null;

  if (session.status === 'signedOut') {
    return (
      <>
        <Card style={{ overflow: 'hidden' }}>
          <Row first icon="icloud" label={t('account.signIn')} onPress={() => router.push('/auth/email')} />
        </Card>
        <Text variant="caption" tone="muted" style={{ marginHorizontal: 4 }}>
          {t('account.signInHelp')}
        </Text>
      </>
    );
  }

  const when = (ms: number) => date(ms, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const statusText =
    sync.state === 'syncing'
      ? t('account.syncing')
      : sync.state === 'error'
        ? t(`account.syncError.${sync.reason}`)
        : sync.lastSyncAt
          ? t('account.lastSync', { time: when(sync.lastSyncAt) })
          : t('account.notSynced');

  const syncNowPressed = async () => {
    setBusy('sync');
    await syncNow();
    setBusy(null);
  };

  const doSignOut = async (keepLocal: boolean) => {
    setBusy('signout');
    try {
      await signOut(keepLocal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setBusy(null);
    }
  };

  // Telefondan silinecekse önce gönderilmeyi bekleyen kayıt kalmasın; kalırsa açıkça sorulur.
  const signOutDeleting = async () => {
    setBusy('signout');
    await syncNow();
    const pending = await pendingCount();
    setBusy(null);
    if (pending === 0) return doSignOut(false);
    Alert.alert(t('account.pendingTitle'), t('account.pendingText', { count: pending }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.signOutAnyway'), style: 'destructive', onPress: () => doSignOut(false) },
    ]);
  };

  const askSignOut = () =>
    Alert.alert(t('account.signOutTitle'), t('account.signOutText'), [
      { text: t('account.keepOnPhone'), onPress: () => doSignOut(true) },
      { text: t('account.removeFromPhone'), style: 'destructive', onPress: signOutDeleting },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const askDelete = () =>
    Alert.alert(t('account.deleteTitle'), t('account.deleteText'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.wipe.continue'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(t('settings.wipe.confirmTitle'), t('settings.wipe.confirmText'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('account.deleteConfirm'),
              style: 'destructive',
              onPress: async () => {
                setBusy('delete');
                try {
                  await deleteAccount();
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } catch {
                  Alert.alert(t('account.deleteFailed'));
                } finally {
                  setBusy(null);
                }
              },
            },
          ]),
      },
    ]);

  return (
    <>
      <Card style={{ overflow: 'hidden' }}>
        <View style={{ padding: 16, gap: 2 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {session.email}
          </Text>
          <Text variant="caption" tone={sync.state === 'error' ? 'rust' : 'muted'}>
            {statusText}
          </Text>
          {sync.rejected > 0 ? (
            <Text variant="caption" tone="rust">
              {t('account.rejected', { count: sync.rejected })}
            </Text>
          ) : null}
        </View>
        <Row
          icon="arrow.triangle.2.circlepath"
          label={t('account.syncNow')}
          busy={busy === 'sync' || sync.state === 'syncing'}
          onPress={syncNowPressed}
        />
        <Row
          icon="rectangle.portrait.and.arrow.right"
          label={t('account.signOut')}
          busy={busy === 'signout'}
          onPress={askSignOut}
        />
        <Row
          icon="person.crop.circle.badge.xmark"
          label={t('account.delete')}
          danger
          busy={busy === 'delete'}
          onPress={askDelete}
        />
      </Card>
      <Text variant="caption" tone="muted" style={{ marginHorizontal: 4 }}>
        {t('account.syncHelp')}
      </Text>
    </>
  );
}
