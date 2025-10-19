import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Button, ScrollView } from 'react-native';

const API = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3001';

export default function App(){
  const [tokens, setTokens] = useState<any>(null);
  async function fetchTokens(){
    try { const res = await fetch(`${API}/api/design/tokens`); setTokens(await res.json()); } catch {}
  }
  useEffect(()=>{ fetchTokens() },[]);

  const bg = tokens?.theme?.bg || '#0b1f3a';
  const text = tokens?.theme?.text || '#fff';
  const primary = tokens?.theme?.primary || '#fec72e';

  return(
    <SafeAreaView style={{ flex:1, backgroundColor: bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color:text, fontSize: 22, fontWeight: '800' }}>Supernova — Mobile</Text>
        <View style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <Text style={{ color:text, marginBottom: 6 }}>Design Tokens</Text>
          <Button color={primary} title="Refresh tokens" onPress={fetchTokens} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
