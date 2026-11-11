import React from 'react';

const PlayerCard = ({ name, ready, isEmpty, isOpponent }) => {
  // Exact styles matched from your original code
  const bg = isOpponent ? (isEmpty ? '#111' : '#070b0a') : '#070b0a';
  const border = ready ? '#4caf50' : '#1e1e1e';
  const boxShadow = ready ? '0 0 16px rgba(76, 175, 80, 0.05)' : 'none';
  
  const avatarBg = isOpponent ? '#111' : '#0a1a14';
  const avatarBorder = isOpponent ? '#222' : '#5ed29c44';
  const avatarColor = isOpponent ? (isEmpty ? '#444' : '#aaa') : '#5ed29c';
  
  const nameColor = isEmpty ? '#555' : '#fff';
  const nameWeight = isEmpty ? 'normal' : '700';

  let statusColor = '#ff9800';
  let statusText = '○ SETUP';
  if (isEmpty) {
    statusColor = '#444';
    statusText = '○ EMPTY';
  } else if (ready) {
    statusColor = '#4caf50';
    statusText = '● READY';
  }

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '16px 10px', textAlign: 'center', transition: 'all 0.3s', boxShadow: boxShadow }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: avatarBg, border: `1px solid ${avatarBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', color: avatarColor, margin: '0 auto 10px', textTransform: 'uppercase' }}>
        {isEmpty ? '?' : name.substring(0, 2)}
      </div>
      <div style={{ fontSize: '12px', color: nameColor, fontWeight: nameWeight, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {name}
      </div>
      <div style={{ fontSize: '10px', color: statusColor, marginTop: '6px', fontWeight: '600' }}>
        {statusText}
      </div>
    </div>
  );
};

export default PlayerCard;