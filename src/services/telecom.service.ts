export interface TelecomCallRecord {
  callId: string;
  clientPhone: string;
  operatorNumber: string | null;
  startTime: Date;
  stopTime: Date;
  totalDuration: number;
  talkDuration: number;
  audioUrl: string | null;
  status: 'answered' | 'missed';
  direction?: 'inbound' | 'outbound';
}

export class UztelecomService {
  private baseURL: string;
  private authHeader: string;
  private accessNumberID = 30943;

  constructor(
    baseURL = 'https://vos.uztelecom.uz',
    username = 'a@sahiy.uz',
    password = 'a5007007'
  ) {
    this.baseURL = baseURL;
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  private async fetchRpc(method: string, params: any) {
    const res = await fetch(`${this.baseURL}/VO_API/jsonrpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.authHeader
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: method,
        method,
        params
      }),
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Uztelecom API error: ${res.statusText}`);
    }
    return res.json();
  }

  async getSyncCalls(startDate: string, endDate: string): Promise<TelecomCallRecord[]> {
    try {
      const callInfoRes = await this.fetchRpc('GetCallInfo', {
        accessNumberID: this.accessNumberID,
        startDate,
        endDate
      });

      const callsData = callInfoRes?.result?.Data || [];

      const wtRes = await this.fetchRpc('GetWiretapping', {
        accessNumberID: this.accessNumberID,
        startDate,
        endDate,
        sendEmail: 0
      });

      const audioData = wtRes?.result?.Data || [];
      const audioMap = new Map<string, string>();
      for (const item of audioData) {
        audioMap.set(item.callId, item.url);
      }

      const grouped = new Map<string, any[]>();
      for (const row of callsData) {
        if (!grouped.has(row.CallId)) {
          grouped.set(row.CallId, []);
        }
        grouped.get(row.CallId)!.push(row);
      }

      const result: TelecomCallRecord[] = [];

      for (const [callId, events] of grouped.entries()) {
        const voEvent = events.find((e: any) => e.ServiceType === 'vo') || events[0];
        const cbxEvent = events.find((e: any) => e.ServiceType === 'cbx' && parseInt(e.CallDuration || '0', 10) > 0) 
                       || events.find((e: any) => e.ServiceType === 'cbx');

        const talkDuration = cbxEvent ? parseInt(cbxEvent.CallDuration || '0', 10) : 0;
        const totalDuration = voEvent.CallDuration ? parseInt(voEvent.CallDuration, 10) : 0;

        let clientPhone = voEvent.ANum;
        let operatorNumber = cbxEvent ? cbxEvent.BNum : null;
        let direction: 'inbound' | 'outbound' = 'inbound';

        // Operator qaytib chiqsa (outbound): ANum operatorniki (masalan 773229501), BNum mijozniki bo'ladi.
        if (voEvent.ANum && voEvent.ANum.length <= 9 && voEvent.BNum && voEvent.BNum.length >= 9 && voEvent.ANum.startsWith('773')) {
          clientPhone = voEvent.BNum;
          operatorNumber = voEvent.ANum;
          direction = 'outbound';
        }

        result.push({
          callId,
          clientPhone,
          operatorNumber,
          startTime: new Date(voEvent.CallStart.replace(' ', 'T') + '+05:00'),
          stopTime: new Date(voEvent.CallStop.replace(' ', 'T') + '+05:00'),
          totalDuration,
          talkDuration,
          audioUrl: audioMap.get(callId) || null,
          status: talkDuration > 0 ? 'answered' : 'missed',
          direction
        });
      }

      return result;
    } catch (err) {
      console.error('Uztelecom API Error:', err);
      return [];
    }
  }

  async getAudioStreamResponse(audioRelativeUrl: string): Promise<Response> {
    const fullUrl = audioRelativeUrl.startsWith('http') 
      ? audioRelativeUrl 
      : `${this.baseURL}${audioRelativeUrl}`;

    return fetch(fullUrl, {
      headers: {
        'Authorization': this.authHeader
      }
    });
  }
}

export const telecomService = new UztelecomService();
