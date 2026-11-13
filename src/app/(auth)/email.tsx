import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';

import { EmailForm } from '../../components/auth/EmailForm';
import { useAuth } from '../../state/AuthContext';

export default function EmailScreen() {
  const { session } = useAuth();

  // A successful sign-in closes this screen (the welcome screen below it closes too).
  useEffect(() => {
    if (session) router.dismiss();
  }, [session]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <EmailForm />
    </ScrollView>
  );
}
