import { useEffect, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function WidgetView() {
  const [widgetType, setWidgetType] = useState<string>("");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const label = getCurrentWebviewWindow().label;
    const type = label.replace("widget-", "");
    setWidgetType(type);
  }, []);

  useEffect(() => {
    if (!widgetType) return;
    function load() {
      try {
        if (widgetType === "tasks") {
          const key = Object.keys(localStorage).find(k => k.startsWith('planner_goals_')) || 'planner_goals_anon';
          const goals = JSON.parse(localStorage.getItem(key) || '[]');
          const today = new Date().toISOString().slice(0, 10);
          const active = goals.filter((g: any) => {
            if (!g.repeat || g.repeat === 'none') return g.date === today;
            if (g.repeat === 'daily') return true;
            const dow = new Date().getDay();
            if (g.repeat === 'weekdays') return dow >= 1 && dow <= 5;
            if (g.repeat === 'weekly') return new Date(g.date).getDay() === dow;
            if (g.repeat === 'custom') return (g.repeatDays || []).includes(dow);
            return false;
          });
          const done = active.filter((g: any) => g.completed || (g.completedDates || []).includes(today)).length;
          setData({ type: 'tasks', goals: active, done, total: active.length });
        } else if (widgetType === "progress") {
          const key = Object.keys(localStorage).find(k => k.startsWith('planner_goals_')) || 'planner_goals_anon';
          const goals = JSON.parse(localStorage.getItem(key) || '[]');
          const today = new Date().toISOString().slice(0, 10);
          const active = goals.filter((g: any) => {
            if (!g.repeat || g.repeat === 'none') return g.date === today;
            if (g.repeat === 'daily') return true;
            const dow = new Date().getDay();
            if (g.repeat === 'weekdays') return dow >= 1 && dow <= 5;
            if (g.repeat === 'weekly') return new Date(g.date).getDay() === dow;
            if (g.repeat === 'custom') return (g.repeatDays || []).includes(dow);
            return false;
          });
          const done = active.filter((g: any) => g.completed || (g.completedDates || []).includes(today)).length;
          const total = active.length || 1;
          setData({ type: 'progress', pct: Math.round((done / total) * 100), done, total });
        } else if (widgetType === "events") {
          const key = Object.keys(localStorage).find(k => k.startsWith('planner_events_')) || 'planner_events_anon';
          const events = JSON.parse(localStorage.getItem(key) || '[]');
          const today = new Date().toISOString().slice(0, 10);
          const now = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes();
          const upcoming = events
            .filter((e: any) => {
              if (e.date > today) return true;
              if (e.date === today && !e.allDay) {
                const [h, m] = (e.startTime || '00:00').split(':').map(Number);
                return h * 60 + m >= nowMin;
              }
              return false;
            })
            .sort((a: any, b: any) => {
              if (a.date !== b.date) return a.date.localeCompare(b.date);
              return (a.startTime || '').localeCompare(b.startTime || '');
            })
            .slice(0, 6);
          setData({ type: 'events', events: upcoming });
        }
      } catch {
        setData({ type: widgetType, error: true });
      }
    }
    load();
    const id = setInterval(load, 3000);
    window.addEventListener('storage', load);
    return () => { clearInterval(id); window.removeEventListener('storage', load); };
  }, [widgetType]);

  if (!widgetType) return <div style={{padding:20,color:'#fff',background:'#1a1a1a',width:'100%',height:'100%'}}>Loading...</div>;
  if (!data) return <div style={{padding:20,color:'#fff',background:'#1a1a1a',width:'100%',height:'100%'}}>Loading {widgetType}...</div>;

  const bgStyle: React.CSSProperties = {
    width: '100%', height: '100%',
    background: '#1a1a1a',
    color: '#fff',
    padding: '16px',
    borderRadius: '12px',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '12px', fontWeight: 700, color: '#FF9500',
    textTransform: 'uppercase', letterSpacing: '0.6px',
    marginBottom: '10px',
  };

  if (data.type === 'tasks') {
    return (
      <div style={bgStyle}>
        <div style={headerStyle}>Today's Tasks</div>
        {!data.goals?.length ? (
          <div style={{fontSize:12,color:'#888',textAlign:'center',padding:'16px 0'}}>No goals for today</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'4px',overflow:'auto'}}>
            {data.goals.map((g: any) => {
              const today = new Date().toISOString().slice(0, 10);
              const done = g.completed || (g.completedDates || []).includes(today);
              return (
                <div key={g.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 0',fontSize:'13px',borderBottom:'1px solid #333'}}>
                  <div style={{
                    width:14,height:14,border:`2px solid ${done ? '#FF9500' : '#666'}`,
                    borderRadius:3,display:'flex',alignItems:'center',justifyContent:'center',
                    background: done ? '#FF9500' : 'transparent',
                  }}>
                    {done && <div style={{width:6,height:3,borderLeft:'2px solid #1a1a1a',borderBottom:'2px solid #1a1a1a',transform:'rotate(-45deg)'}} />}
                  </div>
                  <span style={{textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.4 : 1}}>{g.title}</span>
                </div>
              );
            })}
            <div style={{fontSize:10,color:'#666',textAlign:'center',marginTop:6}}>{data.done}/{data.total} completed</div>
          </div>
        )}
      </div>
    );
  }

  if (data.type === 'progress') {
    const offset = 263.9 - (263.9 * (data.pct || 0)) / 100;
    return (
      <div style={{...bgStyle, alignItems:'center', justifyContent:'center'}}>
        <div style={{position:'relative',width:90,height:90}}>
          <svg viewBox="0 0 100 100" width="90" height="90" style={{transform:'rotate(-90deg)'}}>
            <circle cx="50" cy="50" r="42" fill="none" stroke="#333" strokeWidth="7" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="#FF9500" strokeWidth="7" strokeLinecap="round"
              strokeDasharray="263.9" strokeDashoffset={offset} style={{transition:'stroke-dashoffset 0.5s'}} />
          </svg>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:20,fontWeight:700,color:'#FF9500'}}>
            {data.pct}%
          </div>
        </div>
        <div style={{fontSize:11,color:'#888',marginTop:10}}>Goals Done</div>
        <div style={{fontSize:10,color:'#666',marginTop:4}}>{data.done} / {data.total}</div>
      </div>
    );
  }

  if (data.type === 'events') {
    return (
      <div style={bgStyle}>
        <div style={headerStyle}>Upcoming</div>
        {!data.events?.length ? (
          <div style={{fontSize:12,color:'#888',textAlign:'center',padding:'16px 0'}}>No upcoming events</div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'4px',overflow:'auto'}}>
            {data.events.map((e: any) => (
              <div key={e.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'4px 0',fontSize:12,borderBottom:'1px solid #333'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#FF9500',flexShrink:0}} />
                <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{e.title}</span>
                <span style={{fontSize:10,color:'#888',flexShrink:0}}>
                  {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})} {e.allDay?'':e.startTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div style={{padding:20,color:'#fff',background:'#1a1a1a',width:'100%',height:'100%'}}>Unknown widget: {widgetType}</div>;
}
