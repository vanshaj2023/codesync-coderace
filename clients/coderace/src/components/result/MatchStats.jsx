import React from 'react';

const MatchStats = ({ didIWin, opponentName }) => {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '11px', color: '#444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
        Race complete
      </div>
      
      <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff' }}>
        {didIWin ? 'You win' : `${opponentName || 'Opponent'} wins`}
        <span style={{ color: didIWin ? '#2cbb5d' : '#ef4743' }}>.</span>
      </div>
      
      <div style={{ fontSize: '13px', color: '#666', marginTop: '6px' }}>
        {didIWin 
          ? 'Flawless execution. All test cases passed.' 
          : 'Better luck next time. Analyze the AI review below.'}
      </div>
    </div>
  );
};

export default MatchStats;