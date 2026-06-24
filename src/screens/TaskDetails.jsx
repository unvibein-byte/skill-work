import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Check, Zap, Star, BookOpen, PenLine } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { getRandomTaskByType, resolveTaskReward } from '../utils/dummyTasks';

const themeFor = (type) =>
  type === 'pdf'
    ? { grad: 'linear-gradient(135deg,#175CD3 0%,#2E90FA 100%)', accent: '#175CD3', soft: 'rgba(23,92,211,0.08)', border: 'rgba(23,92,211,0.16)', pill: '#DBEAFE', pillText: '#1D4ED8' }
    : { grad: 'linear-gradient(135deg,#7F56D9 0%,#A855F7 100%)', accent: '#7F56D9', soft: 'rgba(127,86,217,0.08)', border: 'rgba(127,86,217,0.16)', pill: '#E9D5FF', pillText: '#7C3AED' };

const CompactMetaBar = ({ type, reward, time, difficulty, difficultyLabel }) => {
  const t = themeFor(type);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {[
        { icon: '💰', label: `+₹${reward}` },
        { icon: '⏱️', label: time },
        { icon: '⭐', label: difficultyLabel },
      ].map((item, i) => (
        <div key={i} style={{ flex: '1 1 90px', minWidth: 90, background: t.soft, border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{item.label}</span>
        </div>
      ))}
      <div style={{ flex: '1 1 90px', minWidth: 90, background: t.soft, border: `1px solid ${t.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <Star key={i} size={14} style={{ fill: i <= difficulty ? 'var(--orange)' : 'rgba(255,127,0,0.2)', color: i <= difficulty ? 'var(--orange)' : 'rgba(255,127,0,0.2)' }} />
        ))}
      </div>
    </div>
  );
};

const ReferenceDataBox = ({ type, title, rows }) => {
  const t = themeFor(type);
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, border: `1.5px solid ${t.border}`, boxShadow: '0 4px 20px rgba(15,18,32,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: t.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={16} color={t.accent} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Reference</p>
          <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</p>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ background: '#f8f9fc', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>{row.label}</div>
            <div style={{ fontSize: 14, color: row.highlight || 'var(--text-primary)', fontWeight: 700 }}>{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InputSection = ({ type, title, subtitle, children }) => {
  const t = themeFor(type);
  return (
    <div style={{ background: 'linear-gradient(180deg,#fff,#fafbfc)', borderRadius: 16, padding: 16, border: `1px solid ${t.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: t.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PenLine size={16} color={t.accent} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: t.accent, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your answer</p>
            <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{title}</p>
          </div>
        </div>
        <span style={{ background: t.pill, color: t.pillText, borderRadius: 100, padding: '6px 12px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{subtitle}</span>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>{children}</div>
    </div>
  );
};

const fieldStyle = (accent) => ({
  width: '100%',
  padding: '13px 14px',
  borderRadius: 12,
  border: `1px solid ${accent}33`,
  background: 'white',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontWeight: 600,
  boxSizing: 'border-box',
});

const TaskDetails = ({ initialTaskType = 'pdf', initialTaskState = 'select', onClose, onComplete }) => {
  const navigate = useNavigate();

  // Random task data
  const [pdfTask, setPdfTask] = useState(null);
  const [resumeTask, setResumeTask] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);

  // Task selection: 'pdf' | 'resume'
  const [selectedTask, setSelectedTask] = useState(initialTaskType);
  const [taskState, setTaskState] = useState(initialTaskState);
  
  // Load random tasks on mount
  useEffect(() => {
    const pdf = getRandomTaskByType('pdf');
    const resume = getRandomTaskByType('resume');
    setPdfTask(pdf);
    setResumeTask(resume);
    setCurrentTask(pdf);
  }, []);

  // Update currentTask when selected task changes
  useEffect(() => {
    if (selectedTask === 'pdf' && pdfTask) {
      setCurrentTask(pdfTask);
    } else if (selectedTask === 'resume' && resumeTask) {
      setCurrentTask(resumeTask);
    }
  }, [selectedTask, pdfTask, resumeTask]);
  
  // Form data for PDF editing
  const [pdfForm, setPdfForm] = useState({
    invoiceRef: '',
    customerName: '',
    amountDue: '',
  });
  
  // Form data for Resume filling
  const [resumeForm, setResumeForm] = useState({
    fullName: '',
    email: '',
    skills: '',
  });

  // Task reward and time - derived from current task
  const taskDifficultyLabel = currentTask?.difficultyLabel || 'Easy';
  const taskReward = resolveTaskReward(currentTask?.reward, taskDifficultyLabel);
  const taskTime = currentTask?.timeEstimate || '~15 mins';
  const taskDifficulty = currentTask?.difficulty || (taskDifficultyLabel === 'Hard' ? 3 : taskDifficultyLabel === 'Medium' ? 2 : 1);

  // Source data from current task
  const pdfSourceData = currentTask && currentTask.type === 'pdf' ? currentTask.sourceData : {};
  const resumeSourceData = currentTask && currentTask.type === 'resume' ? currentTask.sourceData : {};


  const handleStartTask = (taskType) => {
    setSelectedTask(taskType);
    setCurrentTask(taskType === 'pdf' ? pdfTask : resumeTask);
    setTaskState('active');
  };

  const handleSubmitTask = () => {
    // Validate form based on task type
    if (selectedTask === 'pdf') {
      if (!pdfForm.invoiceRef || !pdfForm.customerName || !pdfForm.amountDue) {
        window.alert('Please fill all fields correctly');
        return;
      }
    } else {
      if (!resumeForm.fullName || !resumeForm.email || !resumeForm.skills) {
        window.alert('Please fill all fields correctly');
        return;
      }
    }
    
    setTaskState('review');
  };

  const handleClaimReward = () => {
    setTaskState('claimed');
    
    // Record the completed task
    const completed = JSON.parse(localStorage.getItem('sw_completed') || '[]');
    const today = new Date().toISOString().slice(0, 10);
    const taskType = selectedTask === 'pdf' ? 'PDF Editing' : 'Resume Filling';
    const taskName = currentTask?.title || 'Unknown Task';
    completed.unshift({
      id: currentTask?.id || Date.now(),
      date: today,
      ts: new Date().toISOString(),
      name: taskName,
      taskTitle: taskName,
      type: taskType,
      category: selectedTask === 'pdf' ? 'Finance' : 'Career',
      reward: taskReward,
    });
    localStorage.setItem('sw_completed', JSON.stringify(completed));

    // Update balance
    const currentBalance = parseFloat(localStorage.getItem('sw_balance') || '0');
    const currentTotalEarned = parseFloat(localStorage.getItem('sw_total_earned') || '0');
    localStorage.setItem('sw_total_earned', (currentTotalEarned + taskReward).toString());
    localStorage.setItem('sw_balance', (currentBalance + taskReward).toString());

    if (onComplete) {
      onComplete(taskReward);
    }

    // Redirect after a brief delay
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate('/main');
      }
    }, 2000);
  };

  const accentTheme = themeFor(selectedTask);

  const handleBack = () => {
    if (taskState === 'select') {
      if (onClose) onClose();
      else navigate('/main');
    } else {
      setTaskState('select');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <PageTransition className="p-0">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>

        {/* Compact header */}
        <div style={{
          padding: '12px 16px',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          background: accentTheme.grad,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: 'white',
          flexShrink: 0,
          boxShadow: '0 4px 24px rgba(15,18,32,0.12)',
        }}>
          <button
            onClick={handleBack}
            aria-label="Go back"
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {taskState === 'select'
                ? 'Choose task'
                : selectedTask === 'pdf'
                  ? 'PDF editing'
                  : 'Resume filling'}
            </h1>
            {taskState !== 'select' && currentTask && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', margin: '2px 0 0' }}>
                #{currentTask.id} · {currentTask.difficultyLabel} · {taskTime}
              </p>
            )}
          </div>
          {taskState !== 'select' && (
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px 10px', fontSize: 13, fontWeight: 800 }}>
              +₹{taskReward}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: taskState === 'review' || taskState === 'claimed' ? 100 : 24 }}>

          {/* TASK SELECTION VIEW */}
          {taskState === 'select' && (
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.55 }}>
                A random task from 100+ samples is ready. Pick PDF or Resume, then start earning.
              </p>

              {/* Task Type Selection Buttons */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 32, borderBottom: 'none', paddingBottom: 0 }}>
                <button
                  onClick={() => setSelectedTask('pdf')}
                  style={{
                    background: selectedTask === 'pdf' ? 'linear-gradient(135deg,#175CD3,#2E90FA)' : 'linear-gradient(135deg,#F0F1F3,#EAEBF0)',
                    border: 'none',
                    padding: '12px 16px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: selectedTask === 'pdf' ? 'white' : 'var(--text-secondary)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: selectedTask === 'pdf' ? '0 4px 16px rgba(23,92,211,0.3)' : 'none',
                  }}
                  onMouseOver={(e) => !selectedTask && (e.target.style.background = 'linear-gradient(135deg,#F5F6F8,#EEF0F5)')}
                  onMouseOut={(e) => !selectedTask && (e.target.style.background = 'linear-gradient(135deg,#F0F1F3,#EAEBF0)')}
                >
                  📄 PDF Tasks
                </button>
                <button
                  onClick={() => setSelectedTask('resume')}
                  style={{
                    background: selectedTask === 'resume' ? 'linear-gradient(135deg,#7F56D9,#A855F7)' : 'linear-gradient(135deg,#F0F1F3,#EAEBF0)',
                    border: 'none',
                    padding: '12px 16px',
                    fontSize: 15,
                    fontWeight: 700,
                    color: selectedTask === 'resume' ? 'white' : 'var(--text-secondary)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: selectedTask === 'resume' ? '0 4px 16px rgba(127,86,217,0.3)' : 'none',
                  }}
                  onMouseOver={(e) => !selectedTask && (e.target.style.background = 'linear-gradient(135deg,#F5F6F8,#EEF0F5)')}
                  onMouseOut={(e) => !selectedTask && (e.target.style.background = 'linear-gradient(135deg,#F0F1F3,#EAEBF0)')}
                >
                  👤 Resume Tasks
                </button>
              </div>

              {/* Task Info Cards with Descriptions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(23,92,211,0.08),rgba(46,144,250,0.08))', padding: 20, borderRadius: 16, border: '1.5px solid rgba(23,92,211,0.2)', transition: 'all 0.3s', transform: selectedTask === 'pdf' ? 'scale(1)' : 'scale(0.95)', opacity: selectedTask === 'pdf' ? 1 : 0.6 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 700 }}>PDF Editing</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 14 }}>Fix invoices, contracts, or scanned documents with intelligent editor</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(23,92,211,0.15)', color: '#175CD3', padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>💰 ₹15-40</span>
                    <span style={{ background: 'rgba(255,127,0,0.15)', color: '#FF7F00', padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>⏱️ 5-15m</span>
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg,rgba(127,86,217,0.08),rgba(168,85,247,0.08))', padding: 20, borderRadius: 16, border: '1.5px solid rgba(127,86,217,0.2)', transition: 'all 0.3s', transform: selectedTask === 'resume' ? 'scale(1)' : 'scale(0.95)', opacity: selectedTask === 'resume' ? 1 : 0.6 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', marginBottom: 8, fontWeight: 700 }}>Resume Builder</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 14 }}>Fill details, format sections, and create polished profiles</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(127,86,217,0.15)', color: '#7F56D9', padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>💰 ₹20-50</span>
                    <span style={{ background: 'rgba(255,127,0,0.15)', color: '#FF7F00', padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>⏱️ 10-30m</span>
                  </div>
                </div>
              </div>

              {/* Difficulty Level */}
              <div style={{ background: 'linear-gradient(135deg,#FFFFFF,#FAFBFC)', padding: 18, borderRadius: 14, border: '1.5px solid var(--border-color)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 700 }}>📊 Difficulty:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3].map((i) => (
                    <Star
                      key={i}
                      size={20}
                      style={{
                        fill: i <= taskDifficulty ? 'var(--orange)' : 'rgba(255,127,0,0.2)',
                        color: i <= taskDifficulty ? 'var(--orange)' : 'rgba(255,127,0,0.2)',
                        transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, marginLeft: 'auto' }}>{taskDifficultyLabel}</span>
              </div>

              {/* Start Button */}
              <button
                onClick={() => handleStartTask(selectedTask)}
                style={{
                  width: '100%',
                  background: selectedTask === 'pdf' ? 'linear-gradient(135deg,#175CD3,#2E90FA)' : 'linear-gradient(135deg,#7F56D9,#A855F7)',
                  color: 'white',
                  border: 'none',
                  padding: '16px',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: selectedTask === 'pdf' ? '0 6px 20px rgba(23,92,211,0.4)' : '0 6px 20px rgba(127,86,217,0.4)',
                }}
                onMouseOver={(e) => { e.target.style.transform = 'translateY(-3px)'; e.target.style.boxShadow = selectedTask === 'pdf' ? '0 8px 24px rgba(23,92,211,0.5)' : '0 8px 24px rgba(127,86,217,0.5)'; }}
                onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = selectedTask === 'pdf' ? '0 6px 20px rgba(23,92,211,0.4)' : '0 6px 20px rgba(127,86,217,0.4)'; }}
              >
                🚀 Start {selectedTask === 'pdf' ? 'PDF Editing' : 'Resume Filling'} Task
              </button>
            </div>
          )}

          {/* ACTIVE TASK — PDF */}
          {taskState === 'active' && selectedTask === 'pdf' && pdfTask && (
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                Read the reference below, then type the corrected values in each field.
              </p>
              <div style={{ marginBottom: 14 }}>
                <CompactMetaBar type="pdf" reward={taskReward} time={taskTime} difficulty={taskDifficulty} difficultyLabel={taskDifficultyLabel} />
              </div>

              <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
                <ReferenceDataBox
                  type="pdf"
                  title="Document on file"
                  rows={[
                    { label: 'Invoice reference', value: pdfTask.sourceData.invoiceRef },
                    { label: 'Customer name', value: pdfTask.sourceData.customerName },
                    { label: 'Amount due', value: `₹ ${pdfTask.sourceData.amountDue}`, highlight: '#175CD3' },
                    { label: 'Billing status', value: `✓ ${pdfTask.sourceData.billingStatus}`, highlight: 'var(--green)' },
                  ]}
                />

                <InputSection type="pdf" title="Enter corrected data" subtitle="Type here">
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Invoice reference</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-001"
                      value={pdfForm.invoiceRef}
                      onChange={(e) => setPdfForm({ ...pdfForm, invoiceRef: e.target.value })}
                      style={fieldStyle('#175CD3')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Customer name</label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={pdfForm.customerName}
                      onChange={(e) => setPdfForm({ ...pdfForm, customerName: e.target.value })}
                      style={fieldStyle('#175CD3')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Amount due</label>
                    <input
                      type="text"
                      placeholder="Amount without ₹ symbol"
                      value={pdfForm.amountDue}
                      onChange={(e) => setPdfForm({ ...pdfForm, amountDue: e.target.value })}
                      style={fieldStyle('#175CD3')}
                    />
                  </div>
                </InputSection>
              </div>

              <button
                onClick={handleSubmitTask}
                className="btn-blue"
                style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Submit for verification
              </button>
            </div>
          )}

          {/* ACTIVE TASK — Resume */}
          {taskState === 'active' && selectedTask === 'resume' && resumeTask && (
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                {resumeTask.editInstructions || currentTask?.description || 'Use the reference profile, then fill in the form below.'}
              </p>
              <div style={{ marginBottom: 14 }}>
                <CompactMetaBar type="resume" reward={taskReward} time={taskTime} difficulty={taskDifficulty} difficultyLabel={taskDifficultyLabel} />
              </div>

              <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
                <ReferenceDataBox
                  type="resume"
                  title="Candidate profile"
                  rows={[
                    { label: 'Full name', value: resumeTask.sourceData.fullName },
                    { label: 'Email', value: resumeTask.sourceData.email },
                    { label: 'Education', value: resumeTask.sourceData.education },
                    { label: 'Experience', value: resumeTask.sourceData.experience, highlight: '#7F56D9' },
                    { label: 'Key skills', value: resumeTask.sourceData.skills },
                  ]}
                />

                {resumeTask.sourceData?.resumeText && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: 12, border: '1px dashed rgba(127,86,217,0.2)', fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#7F56D9', marginBottom: 8, textTransform: 'uppercase' }}>Resume preview</div>
                    {resumeTask.sourceData.resumeText}
                  </div>
                )}

                <InputSection type="resume" title="Your resume entries" subtitle="Type here">
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Full name</label>
                    <input
                      type="text"
                      placeholder="As on reference"
                      value={resumeForm.fullName}
                      onChange={(e) => setResumeForm({ ...resumeForm, fullName: e.target.value })}
                      style={fieldStyle('#7F56D9')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Email</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={resumeForm.email}
                      onChange={(e) => setResumeForm({ ...resumeForm, email: e.target.value })}
                      style={fieldStyle('#7F56D9')}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Key skills</label>
                    <textarea
                      placeholder="Comma-separated skills"
                      value={resumeForm.skills}
                      onChange={(e) => setResumeForm({ ...resumeForm, skills: e.target.value })}
                      style={{ ...fieldStyle('#7F56D9'), minHeight: 96, resize: 'none' }}
                    />
                  </div>
                </InputSection>
              </div>

              <button
                onClick={handleSubmitTask}
                className="btn-purple"
                style={{ width: '100%', padding: '15px', borderRadius: 14, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Submit resume task
              </button>
            </div>
          )}

          {/* REVIEW STATE */}
          {taskState === 'review' && (
            <div style={{ padding: '32px 24px' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.08))', border: '1.5px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: 32, textAlign: 'center', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(16,185,129,0.1)' }} />
                <div style={{ position: 'absolute', bottom: -10, left: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.08)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ background: 'linear-gradient(135deg,#10B981,#059669)', width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 12px 32px rgba(16,185,129,0.35)', animation: 'pulse 2s infinite' }}>
                    <Check size={36} color="white" strokeWidth={3} />
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.5px' }}>✨ Task Approved!</h2>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20, fontWeight: 500 }}>
                    Your submission has been verified and approved successfully.
                  </p>
                  <div style={{ background: 'rgba(16,185,129,0.12)', padding: 16, borderRadius: 12, fontSize: 14, color: '#047857', fontWeight: 700, border: '1px solid rgba(16,185,129,0.2)', marginBottom: 12 }}>
                    💰 You earned <span style={{ fontSize: 20 }}>+₹{taskReward}</span> wallet credit!
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)', padding: 14, borderRadius: 12, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.6 }}>
                    📱 Install and login to the app to cash out real money to your UPI or Bank account. Access 100+ tasks inside.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLAIMED STATE */}
          {taskState === 'claimed' && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(99,102,241,0.08))', border: '1.5px solid rgba(59,130,246,0.2)', borderRadius: 20, padding: 40, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(59,130,246,0.1)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <Loader2 size={56} className="animate-spin" style={{ margin: '0 auto 20px', color: '#3B82F6' }} />
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>🎉 Finalizing Your Reward</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>Please wait while we process your payout...</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Fixed Action Button */}
        {(taskState === 'review' || taskState === 'claimed') && (
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'linear-gradient(180deg,transparent,var(--bg-primary))', padding: '24px', borderTop: '1.5px solid var(--border-color)', boxShadow: '0 -16px 48px rgba(0,0,0,0.08)' }}>
            <button
              onClick={handleClaimReward}
              disabled={taskState === 'claimed'}
              style={{
                width: '100%',
                background: taskState === 'claimed' ? 'linear-gradient(135deg,#E5E7EB,#D1D5DB)' : 'linear-gradient(135deg,#10B981,#059669)',
                color: taskState === 'claimed' ? 'var(--text-secondary)' : 'white',
                border: taskState === 'claimed' ? '1.5px solid var(--border-color)' : 'none',
                padding: '16px',
                borderRadius: 14,
                fontSize: 16,
                fontWeight: 800,
                cursor: taskState === 'claimed' ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: taskState === 'claimed' ? 'none' : '0 8px 24px rgba(16,185,129,0.4)',
              }}
              onMouseOver={(e) => {
                if (taskState !== 'claimed') {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 32px rgba(16,185,129,0.5)';
                }
              }}
              onMouseOut={(e) => {
                if (taskState !== 'claimed') {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 24px rgba(16,185,129,0.4)';
                }
              }}
            >
              {taskState === 'claimed' ? (
                <><Loader2 size={20} className="animate-spin" /> Processing Reward...</>
              ) : (
                <><Zap size={20} /> Claim ₹{taskReward} Reward</>
              )}
            </button>
          </div>
        )}

        </div>
        </PageTransition>
      </div>
    </div>
  );
};

export default TaskDetails;
