import { useState, useEffect } from 'react';
import {
  getAllUsers,
  updateUserPremiumStatus,
  updateUserTaskCount,
  updateUserWalletBalance,
  updateUserBlockStatus,
  isUserBlocked,
  isFirebaseConfigured,
} from '../../firebase';

const AdminTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({
    isPremium: false,
    taskCount: 0,
    walletBalance: 0,
    blocked: false,
    blockReason: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditData({
      isPremium: user.isPremium || false,
      taskCount: user.taskCount || 0,
      walletBalance: user.walletBalance || 0,
      blocked: isUserBlocked(user),
      blockReason: user.blockReason || '',
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    setMessage('');

    try {
      await updateUserPremiumStatus(editingUser, editData.isPremium);
      await updateUserTaskCount(editingUser, editData.taskCount);
      await updateUserBlockStatus(editingUser, editData.blocked, editData.blockReason);

      setUsers(users.map(user =>
        user.id === editingUser
          ? {
              ...user,
              isPremium: editData.isPremium,
              taskCount: editData.taskCount,
              walletBalance: editData.walletBalance,
              blocked: editData.blocked,
              status: editData.blocked ? 'blocked' : 'active',
              blockReason: editData.blockReason,
            }
          : user
      ));
      
      setEditingUser(null);
      setMessage('✅ User data updated successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update user', error);
      setMessage('❌ Failed to update user data');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickBlockUpdate = async (user, nextBlocked) => {
    setSaving(true);
    setMessage('');
    try {
      await updateUserBlockStatus(user.id, nextBlocked, user.blockReason || '');
      setUsers(users.map((item) =>
        item.id === user.id
          ? { ...item, blocked: nextBlocked, status: nextBlocked ? 'blocked' : 'active' }
          : item
      ));
      setMessage(nextBlocked ? '🚫 User blocked' : '✅ User unblocked');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update block status', error);
      setMessage('❌ Failed to update block status');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPremiumUpdate = async (user, nextPremiumState) => {
    setSaving(true);
    setMessage('');
    try {
      await updateUserPremiumStatus(user.id, nextPremiumState);
      setUsers(users.map((item) =>
        item.id === user.id ? { ...item, isPremium: nextPremiumState } : item
      ));
      setMessage(nextPremiumState ? '✅ User upgraded to Premium' : '✅ User downgraded to Free');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update premium status', error);
      setMessage('❌ Failed to change premium status');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Loading users...</div>
      </div>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Firebase not configured. Admin features unavailable.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>
        User Management
      </h2>
      
      {message && (
        <div style={{ 
          padding: '12px 16px', 
          marginBottom: '16px', 
          borderRadius: '8px',
          background: message.includes('✅') ? 'rgba(0, 195, 126, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.includes('✅') ? 'var(--accent-primary)' : '#ef4444',
          border: `1px solid ${message.includes('✅') ? 'var(--accent-primary)' : '#ef4444'}`,
          fontWeight: '500'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 72px 72px 72px 72px 160px', 
          gap: '16px',
          padding: '16px 20px',
          background: 'var(--bg-primary)',
          fontWeight: 'bold',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>Name</div>
          <div>Phone</div>
          <div>Premium</div>
          <div>Tasks</div>
          <div>Balance</div>
          <div>Blocked</div>
          <div>Actions</div>
        </div>
        
        {users.map((user) => (
          <div key={user.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 72px 72px 72px 72px 160px', 
            gap: '16px',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            alignItems: 'center'
          }}>
            {editingUser === user.id ? (
              <>
                <div>{user.name || 'N/A'}</div>
                <div>{user.phone || user.id}</div>
                <div>
                  <input
                    type="checkbox"
                    checked={editData.isPremium}
                    onChange={(e) => setEditData({...editData, isPremium: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                </div>
                <div>
                  <input
                    type="number"
                    value={editData.taskCount}
                    onChange={(e) => setEditData({...editData, taskCount: parseInt(e.target.value) || 0})}
                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                  />
                </div>
                <div style={{ fontSize: '12px' }}>
                  <div>₹{(editData.walletBalance || 0).toFixed(2)}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>read-only</div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    style={{ 
                      padding: '6px 12px', 
                      background: saving ? 'var(--text-secondary)' : 'var(--accent-primary)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    onClick={handleCancel}
                    style={{ 
                      padding: '6px 12px', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-secondary)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: '500' }}>{user.name || 'N/A'}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{user.phone || user.id}</div>
                <div>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px',
                    background: user.isPremium ? 'rgba(0, 195, 126, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                    color: user.isPremium ? 'var(--accent-primary)' : 'var(--text-secondary)'
                  }}>
                    {user.isPremium ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>{user.taskCount || 0}</div>
                <div>
                  <div>₹{Number(user.walletBalance || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>earned ₹{Number(user.totalEarned || 0).toFixed(2)}</div>
                </div>
                <div>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    background: isUserBlocked(user) ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                    color: isUserBlocked(user) ? '#ef4444' : 'var(--text-secondary)',
                  }}>
                    {isUserBlocked(user) ? 'Yes' : 'No'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleQuickBlockUpdate(user, !isUserBlocked(user))}
                    disabled={saving}
                    style={{
                      padding: '6px 10px',
                      background: isUserBlocked(user) ? 'rgba(0, 195, 126, 0.12)' : '#fee2e2',
                      color: isUserBlocked(user) ? 'var(--accent-primary)' : '#ef4444',
                      border: `1px solid ${isUserBlocked(user) ? 'rgba(0, 195, 126, 0.3)' : '#fecaca'}`,
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    {isUserBlocked(user) ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => handleQuickPremiumUpdate(user, !user.isPremium)}
                    disabled={saving}
                    style={{
                      padding: '6px 10px',
                      background: user.isPremium ? '#fee2e2' : 'rgba(0, 195, 126, 0.12)',
                      color: user.isPremium ? '#ef4444' : 'var(--accent-primary)',
                      border: `1px solid ${user.isPremium ? '#fecaca' : 'rgba(0, 195, 126, 0.3)'}`,
                      borderRadius: '6px',
                      fontSize: '11px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1
                    }}
                  >
                    {user.isPremium ? 'Downgrade' : 'Upgrade'}
                  </button>
                  <button 
                    onClick={() => handleEdit(user)}
                    style={{ 
                      padding: '6px 10px', 
                      background: 'var(--accent-primary)', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    Edit
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      
      {users.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          No users found
        </div>
      )}
    </div>
  );
};

export default AdminTab;