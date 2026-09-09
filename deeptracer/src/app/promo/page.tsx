"use client";

import Link from "next/link";
import { useState } from "react";

export default function PromoPage() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-xl">🔍</span>
            </div>
            <span className="text-xl font-bold">DeepTracer</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm">Features</a>
            <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">How it Works</a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm">Pricing</a>
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-sm font-medium transition-all shadow-lg shadow-orange-500/20"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full text-sm text-slate-300 mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            AI Agent Debugging Platform
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Don&apos;t debug the output.
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-amber-400">
              Trace the cause.
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            AI Agent가 실패했을 때, <span className="text-white font-medium">어디서 문제가 시작되었는지</span> 자동으로 찾아주는 
            지능형 디버깅 플랫폼
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              href="/" 
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl text-lg font-semibold transition-all shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/40 hover:scale-105"
            >
              무료로 시작하기
            </Link>
            <a 
              href="#demo" 
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl text-lg font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              데모 보기
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">5분</div>
              <div className="text-slate-500 text-sm mt-1">평균 원인 파악 시간</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">85%</div>
              <div className="text-slate-500 text-sm mt-1">분석 정확도</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">6x</div>
              <div className="text-slate-500 text-sm mt-1">디버깅 속도 향상</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">AI Agent 디버깅, 왜 어려울까요?</h2>
            <p className="text-slate-400 text-lg">기존 Observability 도구의 한계</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">😤</span>
                </div>
                <h3 className="text-xl font-semibold text-red-400">기존 방식</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✕</span>
                  <span className="text-slate-300">수십 개의 로그에서 수동으로 원인 추적</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✕</span>
                  <span className="text-slate-300">&quot;What happened?&quot;만 알 수 있음</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✕</span>
                  <span className="text-slate-300">평균 10~30분+ 소요</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✕</span>
                  <span className="text-slate-300">Multi-Agent 체인 추적 불가</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-700/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-green-400">DeepTracer</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-slate-300">LLM이 자동으로 Root Cause 분석</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-slate-300">&quot;Why did it happen?&quot;까지 설명</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-slate-300">평균 5분 이내 원인 파악</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  <span className="text-slate-300">Error Propagation Path 시각화</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">강력한 기능</h2>
            <p className="text-slate-400 text-lg">AI Agent 디버깅에 필요한 모든 것</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-red-500/50 transition-all hover:shadow-xl hover:shadow-red-500/10">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Trace Dashboard</h3>
              <p className="text-slate-400 leading-relaxed">
                모든 Agent 실행을 한눈에. 상태별 필터링과 통계로 전체 현황을 빠르게 파악하세요.
              </p>
            </div>
            
            <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-orange-500/50 transition-all hover:shadow-xl hover:shadow-orange-500/10">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🌳</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Execution Graph</h3>
              <p className="text-slate-400 leading-relaxed">
                Agent의 실행 흐름을 트리 구조로 시각화. 어디서 문제가 발생했는지 직관적으로 확인하세요.
              </p>
            </div>
            
            <div className="group bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/10">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="text-2xl">🔬</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Root Cause Analysis</h3>
              <p className="text-slate-400 leading-relaxed">
                GPT-5 기반 자동 분석. 실패의 근본 원인과 해결 방안을 신뢰도 점수와 함께 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">어떻게 작동하나요?</h2>
            <p className="text-slate-400 text-lg">3단계로 끝나는 간편한 디버깅</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-slate-700 hidden md:block"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">1</div>
                <h3 className="text-xl font-semibold mb-3">Trace 수집</h3>
                <p className="text-slate-400">Langfuse, LangSmith 또는 커스텀 포맷의 Trace 데이터를 가져옵니다.</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-slate-700 via-slate-700 to-transparent hidden md:block"></div>
              <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">2</div>
                <h3 className="text-xl font-semibold mb-3">AI 분석</h3>
                <p className="text-slate-400">GPT-5가 Span 체인을 분석하여 최초 실패 지점과 전파 경로를 파악합니다.</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">3</div>
                <h3 className="text-xl font-semibold mb-3">해결책 제시</h3>
                <p className="text-slate-400">근본 원인과 함께 구체적인 수정 권장 사항을 받아 바로 적용하세요.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">직접 체험해보세요</h2>
            <p className="text-slate-400 text-lg">예제 Trace로 Root Cause Analysis를 경험하세요</p>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="ml-4 text-slate-400 text-sm">DeepTracer Analysis</span>
            </div>
            <div className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-red-400">🔴</span> Root Cause 발견
                  </h4>
                  <div className="bg-gradient-to-br from-red-950/50 to-orange-950/50 border border-red-800/50 rounded-xl p-4">
                    <p className="text-slate-200">
                      <span className="text-red-400 font-semibold">Rate Limit 초과:</span> API 호출이 분당 제한을 초과하여 429 에러 발생. 
                      첫 번째 실패는 <code className="bg-slate-800 px-2 py-0.5 rounded text-orange-400">search-tool</code> span에서 시작됨.
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <span className="text-green-400">💡</span> 권장 해결책
                  </h4>
                  <div className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 border border-green-800/50 rounded-xl p-4">
                    <p className="text-slate-200">
                      Exponential backoff과 함께 재시도 로직을 구현하고, 
                      요청 간 지연 시간을 최소 200ms로 설정하세요.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <Link 
                  href="/"
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl font-semibold transition-all flex items-center gap-2"
                >
                  전체 분석 결과 보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">누구를 위한 제품인가요?</h2>
            <p className="text-slate-400 text-lg">Production AI Agent를 운영하는 팀을 위해</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-6">👨‍💻</div>
              <h3 className="text-xl font-semibold mb-3">AI Engineers</h3>
              <p className="text-slate-400">Multi-step Agent의 복잡한 실패를 빠르게 진단하고 해결하세요.</p>
            </div>
            
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-6">🚀</div>
              <h3 className="text-xl font-semibold mb-3">AI Startups</h3>
              <p className="text-slate-400">5~20명 규모의 팀에서 AI 제품의 안정성을 높이세요.</p>
            </div>
            
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="text-5xl mb-6">🔧</div>
              <h3 className="text-xl font-semibold mb-3">MLOps Teams</h3>
              <p className="text-slate-400">프로덕션 환경의 Agent 모니터링과 디버깅을 자동화하세요.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">기술 스택</h2>
          <p className="text-slate-400 text-lg mb-12">모던하고 검증된 기술로 구축</p>
          
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { name: "Next.js", icon: "⚡" },
              { name: "TypeScript", icon: "📘" },
              { name: "Tailwind CSS", icon: "🎨" },
              { name: "Supabase", icon: "💾" },
              { name: "OpenAI GPT-5", icon: "🤖" },
            ].map((tech) => (
              <div key={tech.name} className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl">
                <span className="text-xl">{tech.icon}</span>
                <span className="font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">심플한 가격 정책</h2>
            <p className="text-slate-400 text-lg">MVP 기간 동안 무료로 사용하세요</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-4">$0</div>
              <p className="text-slate-400 mb-6">MVP 기간 동안</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> Trace Dashboard
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> Execution Graph
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> 10회/일 분석
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> 커뮤니티 지원
                </li>
              </ul>
              <Link 
                href="/dashboard"
                className="block w-full py-3 text-center bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors"
              >
                시작하기
              </Link>
            </div>
            
            <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-orange-500/30 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full text-xs font-semibold">
                Coming Soon
              </div>
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-4">$49<span className="text-lg text-slate-400">/월</span></div>
              <p className="text-slate-400 mb-6">팀 전용 기능</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> 무제한 분석
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> 실시간 Trace 수집
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> Regression Test 생성
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <span className="text-green-500">✓</span> 우선 지원
                </li>
              </ul>
              <button 
                disabled
                className="block w-full py-3 text-center bg-slate-700/50 rounded-xl font-semibold cursor-not-allowed"
              >
                곧 출시 예정
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            AI Agent 디버깅,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              이제 5분이면 충분합니다.
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            지금 바로 DeepTracer로 시작하세요. 설치 없이 바로 사용 가능합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/" 
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl text-lg font-semibold transition-all shadow-2xl shadow-orange-500/30"
            >
              무료로 시작하기
            </Link>
          </div>
          
          {/* Newsletter Signup */}
          <div className="mt-16 max-w-md mx-auto">
            <p className="text-slate-400 mb-4">업데이트 소식을 받아보세요</p>
            {subscribed ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4">
                <p className="text-green-400">구독해주셔서 감사합니다! 🎉</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-orange-500 transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
                >
                  구독
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <span className="text-sm">🔍</span>
              </div>
              <span className="font-semibold">DeepTracer</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            
            <p className="text-sm text-slate-500">
              © 2026 DeepTracer. Built with ❤️ for AI Engineers.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
