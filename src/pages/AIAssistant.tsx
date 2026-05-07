import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Sparkles, BarChart3, Globe, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTradesAdapted } from '@/hooks/use-trades-adapted';
import { usePlaybooks } from '@/hooks/use-playbooks';
import { useAccount } from '@/contexts/AccountContext';
import type { Trade } from '@/lib/types';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

type Mode = 'coach' | 'analysis' | 'sentiment';
type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const modes: { id: Mode; label: string; icon: typeof Sparkles; desc: string }[] = [
  { id: 'coach', label: 'Trading Coach', icon: Sparkles, desc: 'Get personalized coaching on your trading discipline and performance' },
  { id: 'analysis', label: 'Trade Analysis', icon: BarChart3, desc: 'AI-powered analysis of your trades with actionable insights' },
  { id: 'sentiment', label: 'Market Sentiment', icon: Globe, desc: 'Market sentiment analysis and outlook for your instruments' },
];

function buildTradeContext(
  trades: Trade[],
  accountName?: string,
  playbooks?: { name: string; description?: string | null; conditions: any }[],
): string {
  const header = accountName ? `Account: ${accountName}\n` : '';
  if (trades.length === 0) return `${header}The trader has no trades logged yet on this account.`;

  const wins = trades.filter(t => t.result > 0);
  const losses = trades.filter(t => t.result <= 0);
  const totalPnL = trades.reduce((s, t) => s + t.result, 0);
  const winRate = ((wins.length / trades.length) * 100).toFixed(2);
  const avgRR = (trades.reduce((s, t) => s + t.rrRatio, 0) / trades.length).toFixed(2);
  const validCount = trades.filter(t => t.isValid).length;
  const avgWin = wins.length ? (wins.reduce((s, t) => s + t.result, 0) / wins.length).toFixed(2) : '0.00';
  const avgLoss = losses.length ? (losses.reduce((s, t) => s + t.result, 0) / losses.length).toFixed(2) : '0.00';
  const bestTrade = trades.reduce((m, t) => t.result > m.result ? t : m, trades[0]);
  const worstTrade = trades.reduce((m, t) => t.result < m.result ? t : m, trades[0]);

  // Group by session
  const bySession = ['London', 'New York', 'Asian'].map(s => {
    const ts = trades.filter(t => t.session === s);
    if (ts.length === 0) return null;
    const pnl = ts.reduce((sum, t) => sum + t.result, 0);
    const wr = (ts.filter(t => t.result > 0).length / ts.length * 100).toFixed(2);
    return `  ${s}: ${ts.length} trades, P&L $${pnl.toFixed(2)}, WR ${wr}%`;
  }).filter(Boolean).join('\n');

  // Group by strategy
  const strategies = [...new Set(trades.map(t => t.strategy).filter(Boolean))];
  const byStrategy = strategies.map(s => {
    const ts = trades.filter(t => t.strategy === s);
    const pnl = ts.reduce((sum, t) => sum + t.result, 0);
    const wr = (ts.filter(t => t.result > 0).length / ts.length * 100).toFixed(2);
    const validPct = (ts.filter(t => t.isValid).length / ts.length * 100).toFixed(2);
    return `  ${s}: ${ts.length} trades, P&L $${pnl.toFixed(2)}, WR ${wr}%, Discipline ${validPct}%`;
  }).join('\n');

  // Emotional patterns
  const emotionStats = ['calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral'].map(e => {
    const ts = trades.filter(t => t.emotionBefore === e);
    if (ts.length === 0) return null;
    const pnl = ts.reduce((sum, t) => sum + t.result, 0);
    return `  ${e} (before): ${ts.length} trades, P&L $${pnl.toFixed(2)}`;
  }).filter(Boolean).join('\n');

  const playbookSection = playbooks && playbooks.length > 0
    ? `\nPlaybooks defined:\n${playbooks.map(p => {
        const conds = Array.isArray(p.conditions) ? p.conditions : [];
        return `  - ${p.name}${p.description ? ` (${p.description})` : ''} — ${conds.length} conditions`;
      }).join('\n')}\n`
    : '';

  return `${header}=== TRADER PERFORMANCE DATA ===
Overall:
- Total trades: ${trades.length} (${wins.length} wins, ${losses.length} losses)
- Win rate: ${winRate}%
- Total P&L: $${totalPnL.toFixed(2)}
- Avg win: $${avgWin} | Avg loss: $${avgLoss}
- Average RR: ${avgRR}
- Discipline (valid trades): ${validCount}/${trades.length} (${((validCount / trades.length) * 100).toFixed(2)}%)
- Best trade: ${bestTrade.instrument} ${bestTrade.direction} on ${bestTrade.date} ($${bestTrade.result.toFixed(2)})
- Worst trade: ${worstTrade.instrument} ${worstTrade.direction} on ${worstTrade.date} ($${worstTrade.result.toFixed(2)})
- Instruments traded: ${[...new Set(trades.map(t => t.instrument))].join(', ')}

By session:
${bySession || '  (no session data)'}

By strategy:
${byStrategy || '  (no strategy data)'}

Emotional state before trade:
${emotionStats || '  (no emotion data)'}
${playbookSection}
Recent ${Math.min(15, trades.length)} trades (most recent first):
${trades.slice(0, 15).map(t => `  ${t.date} ${t.time} | ${t.instrument} ${t.direction} | ${t.session} | ${t.strategy || 'no strategy'} | P&L $${t.result.toFixed(2)} | RR ${t.rrRatio.toFixed(2)} | Emotion ${t.emotionBefore}→${t.emotionDuring}→${t.emotionAfter} | ${t.isValid ? 'VALID' : 'INVALID'}${t.reason ? ` | "${t.reason.slice(0, 80)}"` : ''}`).join('\n')}`;
}

async function streamChat({ messages, mode, onDelta, onDone }: {
  messages: Msg[]; mode: Mode; onDelta: (t: string) => void; onDone: () => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode }),
  });

  if (resp.status === 429) { toast.error('Rate limit exceeded. Please wait and try again.'); onDone(); return; }
  if (resp.status === 402) { toast.error('AI credits exhausted. Add funds in workspace settings.'); onDone(); return; }
  if (!resp.ok || !resp.body) throw new Error('Failed to start stream');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });
    let ni: number;
    while ((ni = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, ni);
      buf = buf.slice(ni + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buf = line + '\n' + buf; break; }
    }
  }
  onDone();
}

export default function AIAssistant() {
  const { trades } = useTradesAdapted();
  const { data: playbooks = [] } = usePlaybooks();
  const { currentAccount } = useAccount();
  const [mode, setMode] = useState<Mode>('coach');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const ctx = buildTradeContext(trades, currentAccount?.name, playbooks);
    const userContent = mode !== 'sentiment'
      ? `${ctx}\n\nUser question: ${input.trim()}`
      : input.trim();
    const userMsg: Msg = { role: 'user', content: userContent };
    const displayMsg: Msg = { role: 'user', content: input.trim() };

    setMessages(prev => [...prev, displayMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const allMsgs = [...messages.map(m => m.role === 'user' ? { ...m, content: `${ctx}\n\nUser question: ${m.content}` } : m), userMsg];
      await streamChat({ messages: allMsgs, mode, onDelta: upsert, onDone: () => setIsLoading(false) });
    } catch (e) {
      console.error(e);
      toast.error('Failed to get AI response');
      setIsLoading(false);
    }
  };

  const clearChat = () => { setMessages([]); };
  const currentMode = modes.find(m => m.id === mode)!;

  const quickPrompts: Record<Mode, string[]> = {
    coach: ['Analyze my overall discipline', 'What are my biggest mistakes?', 'How can I improve my win rate?', 'Review my emotional patterns'],
    analysis: ['Analyze my best and worst trades', 'Which strategy performs best?', 'How does session timing affect my results?', 'Review my risk management'],
    sentiment: ['EUR/USD outlook for this week', 'XAU/USD key levels to watch', 'GBP/USD sentiment analysis', 'Major economic events ahead'],
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" /> AI Assistant
          </h1>
          <p className="text-sm text-muted-foreground">Your personal trading AI — coach, analyst, and market expert</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setMessages([]); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              mode === m.id
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            <m.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <currentMode.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">{currentMode.label}</h2>
                <p className="text-sm text-muted-foreground max-w-md mt-1">{currentMode.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2 max-w-lg justify-center">
                {quickPrompts[mode].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); }}
                    className="px-3 py-1.5 rounded-full text-xs bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-foreground'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-muted/30 [&_code]:px-1 [&_code]:rounded">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Ask your ${currentMode.label.toLowerCase()}...`}
              className="flex-1 min-h-[44px] max-h-32 resize-none bg-secondary/30 border-border text-sm"
              rows={1}
            />
            <Button onClick={send} disabled={!input.trim() || isLoading} size="icon" className="h-11 w-11 flex-shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            AI responses are for educational purposes only — not financial advice
          </p>
        </div>
      </Card>
    </div>
  );
}
