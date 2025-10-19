import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, Button, ScrollView } from 'react-native';
import Constants from 'expo-constants';

const API = Constants.expoConfig?.extra?.expoPublic?.API_BASE || process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3001';

export default function App(){
  const [tokens, setTokens] = useState<any>(null);
  async function refresh(){ try { const r = await fetch(`${API}/api/design/tokens`); setTokens(await r.json()); } catch {} }
  useEffect(()=>{ refresh() },[]);

  const bg = tokens?.theme?.bg || '#0b1f3a';
  const text = tokens?.theme?.text || '#fff';
  const primary = tokens?.theme?.primary || '#fec72e';

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color:text, fontSize: 24, fontWeight: '800' }}>Supernova — Mobile</Text>
        <View style={{ marginTop: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16 }}>
          <Text style={{ color:text, marginBottom: 8 }}>Design Tokens:</Text>
          <Text style={{ color:text, marginBottom: 8 }}>{JSON.stringify(tokens)}</Text>
          <Button color={primary} title="Refresh" onPress={refresh} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
