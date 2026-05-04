'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, CheckCircle2, XCircle, RefreshCw, Home, BookOpen, Brain, Trophy, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ==================== TYPES & DATA ====================
import { GameMode, Part, InteractiveType, InteractiveQuestion, MultipleChoice, BooleanQuestion, ShortAnswer, SubSkill, Topic } from '@/lib/types';
import { topicData } from '@/lib/questions';

// ==================== MAIN APP COMPONENT ====================
export default function GiaSuAI() {
  const [mode, setMode] = useState<GameMode>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [currentPart, setCurrentPart] = useState<Part>('part1');
  const [currentSubSkill, setCurrentSubSkill] = useState<SubSkill | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [subSkillIndex, setSubSkillIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState({ part1: 0, part2: 0, total: 0, p1Total: 0, p2Total: 0 });
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/sign-up');
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }
    setQuestionIndex(0); setSubSkillIndex(0); setAnswers({});
    setShowExplanation(false); setScore({ part1: 0, part2: 0, total: 0, p1Total: 0, p2Total: 0 });
  };

  const handleSelectTopic = (topic: Topic) => {
    setCurrentTopic(topic); resetLearning();
    setCurrentPart('part1'); setCurrentSubSkill(null);
    setMode('subskill');
  };

  const handleStartSubSkill = (sk: SubSkill) => {
    setCurrentSubSkill(sk); setQuestionIndex(0); setShowExplanation(false);
    setMode('learning');
  };

  const handleSkipSubSkills = () => {
    setCurrentPart('part1'); setQuestionIndex(0); setShowExplanation(false);
    setMode('learning');
  };

  const handleAnswer = (isCorrect: boolean) => {
    setShowExplanation(true);
    if (isCorrect) {
      setScore(s => ({
        ...s,
        part1: currentPart === 'part1' ? s.part1 + 1 : s.part1,
        part2: currentPart === 'part2' ? s.part2 + 1 : s.part2,
      }));
    }
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentSubSkill) {
      if (questionIndex < currentSubSkill.questions.length - 1) {
        setQuestionIndex(q => q + 1);
      } else {
        // Done with subskill - go back to subskill menu or next subskill
        if (subSkillIndex < (currentTopic?.subSkills.length ?? 0) - 1) {
          setSubSkillIndex(i => i + 1);
          setCurrentSubSkill(currentTopic!.subSkills[subSkillIndex + 1]);
          setQuestionIndex(0);
        } else {
          setCurrentSubSkill(null); setQuestionIndex(0); setMode('subskill');
        }
      }
    } else if (currentPart === 'part1') {
      if (questionIndex < (currentTopic?.part1.length ?? 0) - 1) {
        setQuestionIndex(q => q + 1);
      } else {
        setCurrentPart('part2'); setQuestionIndex(0);
      }
    } else {
      if (questionIndex < (currentTopic?.part2.length ?? 0) - 1) {
        setQuestionIndex(q => q + 1);
      } else {
        setMode('results');
      }
    }
  };

  // ===== SCREENS =====
  if (mode === 'home') return <HomeScreen onStart={() => setMode('topicSelect')} />;
  if (mode === 'topicSelect') return (
    <TopicSelectScreen topics={topicData} onSelect={handleSelectTopic} onBack={() => setMode('home')} />
  );
  if (mode === 'subskill' && currentTopic) return (
    <SubSkillScreen topic={currentTopic} subSkillIndex={subSkillIndex}
      onStart={handleStartSubSkill} onSkip={handleSkipSubSkills}
      onBack={() => setMode('topicSelect')} />
  );
  if (mode === 'learning' && currentTopic) {
    const questions = currentSubSkill ? currentSubSkill.questions
      : currentPart === 'part1' ? currentTopic.part1 : currentTopic.part2;
    const q = questions[questionIndex];
    const total = questions.length;
    return (
      <LearningScreen question={q} questionIndex={questionIndex} total={total}
        part={currentSubSkill ? 'subskill' : currentPart}
        topicName={currentTopic.name}
        subSkillName={currentSubSkill?.title}
        showExplanation={showExplanation}
        onAnswer={handleAnswer} onNext={handleNext}
        onBack={() => { setMode(currentSubSkill ? 'subskill' : 'topicSelect'); resetLearning(); }} />
    );
  }
  if (mode === 'results' && currentTopic) return (
    <ResultsScreen topic={currentTopic} score={score}
      onRetry={() => { resetLearning(); setCurrentPart('part1'); setCurrentSubSkill(null); setMode('subskill'); }}
      onHome={() => { setCurrentTopic(null); setMode('topicSelect'); }} />
  );
  return <HomeScreen onStart={() => setMode('topicSelect')} />;
}

// ==================== HOME SCREEN ====================
function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="text-7xl animate-bounce">🧬</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gia Sư AI — Quy luật Di Truyền
          </h1>
          <p className="text-xl text-slate-600">Học tương tác · Phản hồi tức thì · Chuẩn BGDĐT</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[['📗 Mendel & Mở rộng','Phân li, phân li độc lập, tương tác gen','from-emerald-400 to-teal-500'],
            ['🔗 Liên kết & Hoán vị','Morgan, bản đồ di truyền, tần số HVG','from-violet-400 to-purple-500'],
            ['⚥ Di truyền giới tính','NST X/Y, bệnh liên kết giới tính','from-pink-400 to-rose-500'],
            ['🔵 Di truyền ngoài nhân','Ti thể, lục lạp, di truyền theo mẹ','from-cyan-400 to-blue-500']].map(([t,d,c],i) => (
            <div key={i} className={`p-4 rounded-2xl bg-gradient-to-br ${c} text-white text-left`}>
              <div className="font-bold text-sm">{t}</div>
              <div className="text-xs opacity-80 mt-1">{d}</div>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <div className="text-amber-800 font-semibold">🏆 Chủ đề 5: Tổng hợp Quy luật Di Truyền</div>
          <div className="text-amber-700 text-sm">Vận dụng và phân biệt tổng hợp các quy luật · Bài tập nâng cao</div>
        </div>
        <Button onClick={onStart} size="lg" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xl py-6 rounded-2xl shadow-lg">
          🚀 Bắt đầu học ngay!
        </Button>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[['5','Chủ đề'],['200+','Câu hỏi'],['100%','Tương tác']].map(([n,l],i) => (
            <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{n}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== TOPIC SELECT ====================
function TopicSelectScreen({ topics, onSelect, onBack }: { topics: Topic[]; onSelect: (t: Topic) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pt-4">
          <Button variant="outline" size="sm" onClick={onBack}><Home className="w-4 h-4 mr-1" />Trang chủ</Button>
          <h2 className="text-2xl font-bold text-slate-800">Chọn chủ đề học</h2>
        </div>
        <div className="space-y-4">
          {topics.map((t, i) => (
            <Card key={t.id} className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 hover:border-blue-300"
              onClick={() => onSelect(t)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-2xl`}>
                    {t.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">{t.name}</div>
                    <div className="text-sm text-slate-500 mt-1">{t.description}</div>
                    <div className="flex gap-3 mt-2">
                      <Badge variant="secondary">🎯 {t.subSkills.length} kỹ năng con</Badge>
                      <Badge variant="secondary">📝 {t.part1.length} PT củng cố</Badge>
                      <Badge variant="secondary">✅ {t.part2.length} PT luyện</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SUBSKILL SCREEN ====================
function SubSkillScreen({ topic, subSkillIndex, onStart, onSkip, onBack }:
  { topic: Topic; subSkillIndex: number; onStart: (sk: SubSkill) => void; onSkip: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack}><Home className="w-4 h-4 mr-1" />Chọn chủ đề</Button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{topic.name}</h2>
            <p className="text-sm text-slate-500">Luyện kỹ năng con trước khi làm bài chính</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-blue-800 font-semibold mb-1">
            <Brain className="w-5 h-5" />Luyện kỹ năng con
          </div>
          <p className="text-blue-700 text-sm">Mỗi kỹ năng con giúp bạn nắm vững một kỹ thuật nhỏ để giải bài tập lớn hiệu quả hơn.</p>
        </div>
        <div className="space-y-3">
          {topic.subSkills.map((sk, i) => (
            <Card key={sk.id} className={`border-2 transition-all ${i < subSkillIndex ? 'border-green-300 bg-green-50' : i === subSkillIndex ? 'border-blue-400 shadow-md' : 'border-slate-200 opacity-60'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                  ${i < subSkillIndex ? 'bg-green-500' : i === subSkillIndex ? 'bg-blue-500' : 'bg-slate-300'}`}>
                  {i < subSkillIndex ? '✓' : i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{sk.title}</div>
                  <div className="text-sm text-slate-500">{sk.description} · {sk.questions.length} câu</div>
                </div>
                {i === subSkillIndex && (
                  <Button size="sm" onClick={() => onStart(sk)} className="bg-blue-500 text-white">
                    Bắt đầu <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={onSkip} variant="outline" className="w-full border-dashed">
          <BookOpen className="w-4 h-4 mr-2" /> Bỏ qua kỹ năng con → Vào bài học chính (Phần 1)
        </Button>
      </div>
    </div>
  );
}

// ==================== LEARNING SCREEN ====================
function LearningScreen({ question, questionIndex, total, part, topicName, subSkillName, showExplanation, onAnswer, onNext, onBack }:
  { question: any; questionIndex: number; total: number; part: string; topicName: string;
    subSkillName?: string; showExplanation: boolean;
    onAnswer: (c: boolean) => void; onNext: () => void; onBack: () => void }) {
  const partLabel = part === 'subskill' ? `🧩 ${subSkillName}` : part === 'part1' ? '📚 Phần 1 – Củng cố kiến thức' : '✅ Phần 2 – Tự luyện chuẩn thi';
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onBack}>← Quay lại</Button>
          <Badge className="text-xs">{partLabel}</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-slate-500">
            <span>{topicName}</span>
            <span>Câu {questionIndex + 1}/{total}</span>
          </div>
          <Progress value={((questionIndex + 1) / total) * 100} className="h-2" />
        </div>
        <QuestionCard question={question} showExplanation={showExplanation} onAnswer={onAnswer} />
        {showExplanation && (
          <Button onClick={onNext} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-xl">
            {questionIndex < total - 1 ? 'Câu tiếp theo →' : part === 'part1' ? '🎯 Chuyển sang Phần 2' : '🏆 Xem kết quả'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================== QUESTION CARD ====================
function QuestionCard({ question, showExplanation, onAnswer }:
  { question: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  if (!question) return null;
  if (question.type === 'multiple' || question.type === 'subskill-mc')
    return <MultipleChoiceCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  if (question.type === 'boolean')
    return <BooleanCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  if (question.type === 'short')
    return <ShortAnswerCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  if (question.type === 'matching')
    return <MatchingCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  if (question.type === 'drag-drop')
    return <DragDropCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  if (question.type === 'fill-blank')
    return <FillBlankCard q={question} showExplanation={showExplanation} onAnswer={onAnswer} />;
  return null;
}

// ==================== MULTIPLE CHOICE ====================
function MultipleChoiceCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const handleSelect = (letter: string) => {
    if (showExplanation) return;
    setSelected(letter);
    onAnswer(letter === q.correctAnswer);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base leading-relaxed">{q.question || q.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.options.map((opt: any) => {
          const isSelected = selected === opt.letter;
          const isCorrect = opt.letter === q.correctAnswer;
          let cls = 'border-2 rounded-xl p-3 cursor-pointer transition-all ';
          if (!showExplanation) cls += isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50';
          else if (isCorrect) cls += 'border-green-400 bg-green-50';
          else if (isSelected && !isCorrect) cls += 'border-red-400 bg-red-50';
          else cls += 'border-slate-200 opacity-60';
          return (
            <div key={opt.letter} className={cls} onClick={() => handleSelect(opt.letter)}>
              <div className="flex gap-3 items-start">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${showExplanation && isCorrect ? 'bg-green-500 text-white' :
                    showExplanation && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                    isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {opt.letter}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{opt.text}</p>
                  {showExplanation && q.explanations?.[opt.letter] && (
                    <p className={`text-xs mt-1 ${isCorrect ? 'text-green-700' : 'text-slate-500'}`}>
                      {q.explanations[opt.letter]}
                    </p>
                  )}
                </div>
                {showExplanation && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
              </div>
            </div>
          );
        })}
        {showExplanation && q.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
            <p className="text-xs text-blue-800"><span className="font-bold">💡 Giải thích: </span>{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== BOOLEAN ====================
function BooleanCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const handleSelect = (val: boolean) => {
    if (showExplanation) return;
    setSelected(val);
    onAnswer(val === q.correct);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Đúng hay Sai?</CardTitle>
        <CardDescription className="text-base text-slate-700 mt-2 leading-relaxed">{q.statement}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[{val: true, label: '✅ Đúng'}, {val: false, label: '❌ Sai'}].map(({val, label}) => {
            const isSel = selected === val;
            const isAns = q.correct === val;
            let cls = `p-4 rounded-xl border-2 cursor-pointer font-semibold text-center transition-all `;
            if (!showExplanation) cls += isSel ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300';
            else if (isAns) cls += 'border-green-400 bg-green-50 text-green-800';
            else if (isSel && !isAns) cls += 'border-red-400 bg-red-50 text-red-800';
            else cls += 'border-slate-200 opacity-50';
            return (
              <div key={String(val)} className={cls} onClick={() => handleSelect(val)}>
                {label}
              </div>
            );
          })}
        </div>
        {showExplanation && (
          <div className={`rounded-xl p-3 ${q.correct === selected ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="text-sm text-slate-700">{q.correct === selected ? '🎉 Chính xác! ' : '💡 Chưa đúng. '}{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== SHORT ANSWER ====================
function ShortAnswerCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const check = () => {
    // Flexible grading: remove spaces, punctuation, lowercase
    const normalize = (str: string) => str.toLowerCase().replace(/[\s\.\,\;\:\-\_]/g, '').trim();
    const normalizedInput = normalize(input);
    const ok = q.acceptedAnswers.some((a: string) => {
      const normalizedAnswer = normalize(a);
      // Chấp nhận nếu giống hệt, hoặc người dùng gõ dài hơn chứa đáp án, 
      // hoặc đáp án dài nhưng người dùng gõ được >= 80% từ khoá
      return normalizedInput === normalizedAnswer || 
             normalizedInput.includes(normalizedAnswer) || 
             (normalizedAnswer.includes(normalizedInput) && normalizedInput.length >= normalizedAnswer.length * 0.8);
    });
    setIsCorrect(ok); setChecked(true); onAnswer(ok);
  };
  return (
    <Card>
      <CardHeader><CardTitle className="text-base leading-relaxed">{q.question || q.title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {q.hints && !checked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-xs text-yellow-800">💡 Gợi ý: {q.hints[0]}</p>
          </div>
        )}
        <Input value={input} onChange={e => setInput(e.target.value)} disabled={checked}
          placeholder="Nhập câu trả lời của bạn..." className="border-2" />
        {!checked && (
          <Button onClick={check} className="w-full" disabled={!input.trim()}>Kiểm tra đáp án</Button>
        )}
        {checked && (
          <div className={`rounded-xl p-3 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="font-semibold text-sm">{isCorrect ? '🎉 Chính xác!' : '💡 Chưa đúng'}</p>
            <p className="text-sm mt-1">{q.explanation}</p>
            {!isCorrect && <p className="text-sm text-green-700 mt-1">✓ Đáp án: {q.acceptedAnswers[0]}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== MATCHING (DRAG & DROP) ====================
function MatchingCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [leftItems] = useState(() => [...q.pairs].map((p: any) => p.left));
  const [availableRight, setAvailableRight] = useState<string[]>(() => 
    [...q.pairs].map((p: any) => p.right).sort(() => Math.random() - 0.5)
  );
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  
  // State for mobile click-to-select fallback
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, source: 'available' | 'matched', value: string, leftKey?: string) => {
    if (submitted) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ source, value, leftKey }));
  };

  const handleDropToMatch = (e: React.DragEvent, leftKey: string) => {
    e.preventDefault();
    if (submitted) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      placeItem(data.source, data.value, leftKey, data.leftKey);
    } catch (err) {}
  };

  const handleDropToAvailable = (e: React.DragEvent) => {
    e.preventDefault();
    if (submitted) return;
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.source === 'matched' && data.leftKey) {
        removeItem(data.leftKey, data.value);
      }
    } catch (err) {}
  };
  
  // Logic to move items
  const placeItem = (source: 'available' | 'matched', value: string, targetLeftKey: string, sourceLeftKey?: string) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      const existing = newMatches[targetLeftKey];
      
      newMatches[targetLeftKey] = value;
      
      if (source === 'available') {
        setAvailableRight(av => {
          const newAv = av.filter(v => v !== value);
          if (existing) newAv.push(existing);
          return newAv;
        });
      } else if (source === 'matched' && sourceLeftKey && sourceLeftKey !== targetLeftKey) {
        delete newMatches[sourceLeftKey];
        if (existing) newMatches[sourceLeftKey] = existing;
      }
      return newMatches;
    });
    setSelectedRight(null);
  };
  
  const removeItem = (leftKey: string, value: string) => {
    setAvailableRight(prev => [...prev, value]);
    setMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[leftKey];
      return newMatches;
    });
  };

  // Click handlers for mobile fallback
  const handleRightClick = (value: string) => {
    if (submitted) return;
    setSelectedRight(selectedRight === value ? null : value);
  };
  
  const handleLeftSlotClick = (leftKey: string) => {
    if (submitted) return;
    
    // If a right item is selected, place it here
    if (selectedRight) {
      placeItem('available', selectedRight, leftKey);
    } 
    // If no right item selected but slot has item, return item to available
    else if (matches[leftKey]) {
      removeItem(leftKey, matches[leftKey]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correct = q.pairs.every((p: any) => matches[p.left] === p.right);
    onAnswer(correct);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{q.title}</CardTitle>
        <CardDescription>{q.description} · (Kéo thả hoặc bấm chọn)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drop zones */}
        <div className="space-y-3">
          {leftItems.map((left: string, i: number) => {
            const matchedValue = matches[left];
            const originalRight = q.pairs.find((p: any) => p.left === left)?.right;
            const isCorrect = submitted && matchedValue === originalRight;
            
            return (
              <div key={i} className="flex flex-col sm:flex-row gap-2 border-2 border-slate-100 rounded-xl p-2 bg-slate-50">
                <div className="sm:w-1/2 p-3 bg-blue-50 text-blue-900 rounded-lg text-sm font-medium flex items-center shadow-sm">
                  {left}
                </div>
                <div 
                  className={`sm:w-1/2 p-3 min-h-[3rem] rounded-lg border-2 border-dashed flex items-center justify-center text-sm transition-all cursor-pointer
                    ${!matchedValue && selectedRight ? 'border-blue-400 bg-blue-50 animate-pulse' : ''}
                    ${!matchedValue && !selectedRight ? 'border-slate-300' : ''}
                    ${matchedValue && !submitted ? 'border-indigo-300 bg-indigo-50 shadow-sm' : ''}
                    ${submitted && isCorrect ? 'border-green-400 bg-green-50' : ''}
                    ${submitted && !isCorrect && matchedValue ? 'border-red-400 bg-red-50' : ''}
                    ${submitted && !isCorrect && !matchedValue ? 'border-red-400 bg-red-50 text-red-500' : ''}
                  `}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropToMatch(e, left)}
                  onClick={() => handleLeftSlotClick(left)}
                >
                  {matchedValue ? (
                    <div 
                      className="w-full h-full"
                      draggable={!submitted}
                      onDragStart={e => handleDragStart(e, 'matched', matchedValue, left)}
                    >
                      {matchedValue}
                    </div>
                  ) : (
                    <span className="text-slate-400 opacity-70">Thả đáp án vào đây</span>
                  )}
                </div>
                {submitted && (
                  <div className={`mt-2 sm:mt-0 flex items-center justify-center text-xs p-2 rounded 
                    ${isCorrect ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                    {isCorrect ? '✓ Đúng' : `✗ Đáp án: ${originalRight}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Available items */}
        {!submitted && (
          <div 
            className="p-4 bg-slate-100 rounded-xl border-2 border-slate-200 min-h-[6rem]"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropToAvailable}
          >
            <div className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">Đáp án:</div>
            <div className="flex flex-wrap gap-2">
              {availableRight.length === 0 ? (
                <div className="text-slate-400 text-sm italic w-full text-center py-2">Đã ghép hết đáp án</div>
              ) : (
                availableRight.map((r, i) => (
                  <div 
                    key={i} 
                    draggable
                    onDragStart={e => handleDragStart(e, 'available', r)}
                    onClick={() => handleRightClick(r)}
                    className={`p-3 bg-white border shadow-sm rounded-lg text-sm cursor-pointer hover:border-blue-400 transition-all active:scale-95
                      ${selectedRight === r ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-slate-300'}`}
                  >
                    {r}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {!submitted && Object.keys(matches).length === q.pairs.length && (
          <Button onClick={handleSubmit} className="w-full py-6 text-lg font-bold shadow-lg animate-in slide-in-from-bottom-2">
            Kiểm tra
          </Button>
        )}
        
        {submitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <p className="text-sm text-blue-900"><span className="font-bold">💡 Giải thích: </span>{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== DRAG DROP ====================
function DragDropCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [order, setOrder] = useState<string[]>(q.items.map((item: any) => item.id));
  const [submitted, setSubmitted] = useState(false);
  const moveItem = (from: number, to: number) => {
    if (submitted) return;
    const newOrder = [...order];
    const [moved] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, moved);
    setOrder(newOrder);
  };
  const handleSubmit = () => {
    setSubmitted(true);
    const correct = order.every((id, i) => id === q.items[i].id);
    onAnswer(correct);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{q.title}</CardTitle>
        <CardDescription>{q.description} · Dùng nút ↑↓ để sắp xếp</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {order.map((id, idx) => {
          const item = q.items.find((it: any) => it.id === id);
          return (
            <div key={id} className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">{idx + 1}</div>
              <p className="text-sm flex-1">{item?.text}</p>
              {!submitted && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveItem(idx, idx - 1)} disabled={idx === 0}
                    className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs disabled:opacity-30">↑</button>
                  <button onClick={() => moveItem(idx, idx + 1)} disabled={idx === order.length - 1}
                    className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-xs disabled:opacity-30">↓</button>
                </div>
              )}
            </div>
          );
        })}
        {!submitted && <Button onClick={handleSubmit} className="w-full mt-2">Xác nhận thứ tự</Button>}
        {submitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
            <p className="text-xs text-blue-800"><span className="font-bold">💡 Giải thích: </span>{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== FILL BLANK ====================
function FillBlankCard({ q, showExplanation, onAnswer }:
  { q: any; showExplanation: boolean; onAnswer: (c: boolean) => void }) {
  const [inputs, setInputs] = useState<string[]>(q.blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = () => {
    setSubmitted(true);
    // Flexible scoring
    const normalize = (s: string) => s.toLowerCase().replace(/[\s\.\,\;\:\-\_]/g, '').trim();
    const correct = inputs.every((inp, i) => {
      const nInp = normalize(inp);
      const nAns = normalize(q.blanks[i].answer);
      return nInp === nAns || 
             nInp.includes(nAns) || 
             (nAns.includes(nInp) && nInp.length >= nAns.length * 0.8);
    });
    onAnswer(correct);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{q.title}</CardTitle>
        <CardDescription>{q.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.blanks.map((b: any, i: number) => {
          const nInp = inputs[i].toLowerCase().replace(/[\s\.\,\;\:\-\_]/g, '').trim();
          const nAns = b.answer.toLowerCase().replace(/[\s\.\,\;\:\-\_]/g, '').trim();
          const isCorrect = nInp === nAns || nInp.includes(nAns) || (nAns.includes(nInp) && nInp.length >= nAns.length * 0.8);
          
          return (
            <div key={i} className="space-y-2">
              <p className="text-sm text-slate-700 font-medium">{b.text}</p>
              {b.hint && <p className="text-xs text-amber-600 font-medium">💡 {b.hint}</p>}
              <Input value={inputs[i]} disabled={submitted} placeholder="Điền đáp án..."
                onChange={e => { const n = [...inputs]; n[i] = e.target.value; setInputs(n); }}
                className={`border-2 p-3 ${submitted ? (isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800') : ''}`} />
              {submitted && (
                <p className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? '✓ Đúng!' : `✗ Đáp án chuẩn: ${b.answer}`}
                </p>
              )}
            </div>
          );
        })}
        {!submitted && <Button onClick={handleSubmit} className="w-full">Kiểm tra</Button>}
        {submitted && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-900"><span className="font-bold">💡 Giải thích: </span>{q.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== RESULTS SCREEN ====================
function ResultsScreen({ topic, score, onRetry, onHome }:
  { topic: Topic; score: any; onRetry: () => void; onHome: () => void }) {
  const totalQ = topic.part2.length;
  const pct = Math.round((score.part2 / Math.max(totalQ, 1)) * 100);
  const grade = pct >= 80 ? '🏆 Xuất sắc!' : pct >= 60 ? '🎉 Khá tốt!' : '📚 Cần ôn thêm';
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">{pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : '📚'}</div>
          <h2 className="text-2xl font-bold">{grade}</h2>
          <p className="text-slate-600">{topic.name}</p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600">{pct}%</div>
              <p className="text-slate-500 text-sm">Phần 2 – Tự luyện: {score.part2}/{totalQ} câu đúng</p>
            </div>
            <Progress value={pct} className="h-4" />
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Điểm đạt', `${pct}%`, pct >= 80 ? 'text-green-600' : 'text-amber-600'],
                ['Câu đúng', `${score.part2}/${totalQ}`, 'text-blue-600'],
                ['Xếp loại', pct >= 80 ? 'Giỏi' : pct >= 60 ? 'Khá' : 'TB', 'text-purple-600']
              ].map(([l, v, c], i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3">
                  <div className={`text-xl font-bold ${c}`}>{v}</div>
                  <div className="text-xs text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">📚 Khuyến nghị ôn tập</CardTitle></CardHeader>
          <CardContent>
            {pct < 60 && <p className="text-sm text-amber-800 bg-amber-50 rounded-lg p-3">⚠️ Bạn nên ôn lại lý thuyết của chủ đề này và làm lại bài tập từ Phần 1 trước khi thử lại Phần 2.</p>}
            {pct >= 60 && pct < 80 && <p className="text-sm text-blue-800 bg-blue-50 rounded-lg p-3">💡 Kết quả khá tốt! Xem lại những câu sai và luyện thêm các dạng bài tương tự.</p>}
            {pct >= 80 && <p className="text-sm text-green-800 bg-green-50 rounded-lg p-3">🌟 Tuyệt vời! Bạn đã nắm vững chủ đề này. Hãy thử thách chủ đề tiếp theo hoặc làm bài tổng hợp!</p>}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={onRetry} variant="outline" className="py-4">
            <RefreshCw className="w-4 h-4 mr-2" />Làm lại
          </Button>
          <Button onClick={onHome} className="py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Target className="w-4 h-4 mr-2" />Chủ đề khác
          </Button>
        </div>
      </div>
    </div>
  );
}
