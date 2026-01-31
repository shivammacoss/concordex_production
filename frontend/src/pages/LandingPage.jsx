import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  Globe, 
  Users, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  ChevronRight
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import heroVideo from '../assets/herovideo.mp4'
import concorddexLogo from '../assets/concorddex.png'

const LandingPage = () => {
  const { isDark, toggleTheme } = useTheme()
  const [currentStat, setCurrentStat] = useState(0)

  const stats = [
    { value: '$2.5B+', label: 'Trading Volume' },
    { value: '50K+', label: 'Active Traders' },
    { value: '99.9%', label: 'Uptime' },
    { value: '150+', label: 'Countries' }
  ]

  useEffect(() => {
    // Add landing-page class to body for proper scrolling
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="min-h-screen overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minWidth: '320px' }}
    >
      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4"
        style={{ backgroundColor: 'transparent', borderBottom: 'none' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={concorddexLogo} alt="Concorddex" className="h-12 sm:h-16" />
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Features</a>
            <a href="#markets" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Markets</a>
            <a href="#testimonials" className="text-sm font-medium transition-colors hover:text-yellow-500" style={{ color: 'var(--text-secondary)' }}>Testimonials</a>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <a 
              href="/login" 
              className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg transition-colors border"
              style={{ color: '#d4af37', borderColor: '#d4af37' }}
            >
              Login
            </a>
            <a 
              href="/signup" 
              className="gold-shine-btn px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        
        {/* Dark Overlay */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.8) 100%)',
            zIndex: 1 
          }}
        ></div>
        
        
        
      </section>

      {/* CTA & Stats Section - Animated */}
      <section className="py-20 sm:py-32 px-4 sm:px-6 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #000000 100%)' }}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)' }}></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-10 animate-pulse" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)', animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 60%)' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Glowing CTA Buttons */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 justify-center mb-16">
            <a 
              href="/signup" 
              className="gold-shine-btn group relative inline-flex items-center justify-center gap-3 px-10 sm:px-14 py-5 sm:py-6 rounded-2xl text-xl"
            >
              <span className="relative z-10">Start Trading Now</span>
              <ArrowRight size={24} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/login" 
              className="group inline-flex items-center justify-center gap-3 px-10 sm:px-14 py-5 sm:py-6 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-110 border-2 backdrop-blur-sm"
              style={{ borderColor: '#d4af37', color: '#d4af37', background: 'rgba(212, 175, 55, 0.05)' }}
            >
              View Demo
              <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
          
          {/* Animated Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="group relative p-6 sm:p-8 rounded-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(0, 0, 0, 0.8) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, transparent 100%)' }}></div>
                <div className="relative z-10">
                  <div className="text-3xl sm:text-4xl font-black mb-2 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%)' }}>{stat.value}</div>
                  <div className="text-sm sm:text-base font-medium" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Epic Design */}
      <section className="py-24 sm:py-40 px-4 sm:px-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.15) 0%, transparent 50%), linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}></div>
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 60%)' }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <Zap size={16} style={{ color: '#d4af37' }} />
            <span className="text-sm font-medium gold-shine-text">Get Started Today</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">Ready to <span className="gold-shine-text">Start Trading</span>?</h2>
          <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Join thousands of successful traders on Concorddex. Create your free account in minutes.
          </p>
          
          <a 
            href="/signup" 
            className="gold-shine-btn group inline-flex items-center gap-3 px-12 sm:px-16 py-6 sm:py-7 rounded-2xl text-xl sm:text-2xl"
          >
            Create Free Account
            <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
          </a>
          
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>No minimum deposit</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>Free demo account</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              </div>
              <span className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Forex Trading Section */}
      <section id="forex-trading" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <TrendingUp size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Forex Trading</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Trade the Global Forex Market with <span className="gold-shine-text">Confidence</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Unlock Opportunities in the World's Largest Financial Market. Forex trading gives you access to the global currency market, where trillions of dollars are traded every day.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Choose Forex Trading?</h3>
              <ul className="space-y-4">
                {['24/5 Market Access – Trade during global market hours', 'High Liquidity – Smooth trade execution with minimal slippage', 'Two-Way Opportunities – Earn in both rising and falling markets', 'Low Entry Barrier – Trade with flexible position sizes', 'Global Market Exposure – Currencies, Gold, and major financial instruments'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Our Trading Approach</h3>
              <ul className="space-y-4">
                {['Technical and price-action-based analysis', 'Trend identification and key support & resistance levels', 'Strict risk management and capital protection', 'Disciplined and consistent trading methods'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm italic" style={{ color: 'var(--text-muted)' }}>Our aim is not short-term excitement, but long-term sustainable growth.</p>
            </div>
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Trade Smart. Trade Safe.</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Forex trading involves risk, and success requires education, patience, and discipline. We prioritize risk control and strategy execution to help traders build confidence and consistency over time.</p>
            <p className="text-lg font-semibold gold-shine-text">Learn. Analyze. Trade. Grow.</p>
          </div>
        </div>
      </section>

      {/* Crypto Trading Section */}
      <section id="crypto-trading" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <span className="text-lg">₿</span>
              <span className="text-sm font-medium gold-shine-text">Crypto Trading</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Trade the Future with <span className="gold-shine-text">Crypto Trading</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Explore the World of Digital Assets. Trade popular digital currencies like Bitcoin, Ethereum, and other altcoins in a fast-moving global market.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Choose Crypto Trading?</h3>
              <ul className="space-y-4">
                {['24/7 Market Access – Trade anytime, without market closures', 'High Volatility – More opportunities from price movements', 'Decentralized Market – No central authority control', 'Global Accessibility – Trade from anywhere in the world', 'Diverse Assets – Bitcoin, Ethereum, Altcoins & more'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Our Trading Philosophy</h3>
              <ul className="space-y-4">
                {['Strong technical and market structure analysis', 'Clear entry and exit strategies', 'Risk management and capital preservation', 'Discipline and consistency over emotions'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm italic" style={{ color: 'var(--text-muted)' }}>Crypto trading is not luck — it's strategy + patience.</p>
            </div>
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Secure & Smart Trading</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>The crypto market is powerful but volatile. That's why we focus on responsible trading practices, helping traders understand risk before chasing rewards.</p>
            <p className="text-lg font-semibold gold-shine-text">Learn the Market. Manage Risk. Trade Confidently.</p>
          </div>
        </div>
      </section>

      {/* Copy Trading Section */}
      <section id="copy-trading" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Users size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Copy Trading</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Copy Trade Like a Pro — <span className="gold-shine-text">Even Without Experience</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Follow. Copy. Grow. Copy trading allows you to automatically copy the trades of experienced and successful traders in real time.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { step: '1', title: 'Choose a Trader', desc: 'Select from verified, performance-tracked traders' },
              { step: '2', title: 'Set Your Risk', desc: 'Control how much capital you want to allocate' },
              { step: '3', title: 'Copy Automatically', desc: 'Trades are mirrored instantly in your account' },
              { step: '4', title: 'Track Performance', desc: 'Monitor results and adjust anytime' }
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold" style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37' }}>{item.step}</div>
                <h4 className="font-bold mb-2">{item.title}</h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Choose Copy Trading?</h3>
              <ul className="space-y-4">
                {['Beginner-Friendly – No technical knowledge required', 'Time-Saving – No charts, no constant monitoring', 'Real-Time Execution – Trades copied instantly', 'Risk Control – You decide how much to invest', 'Transparency – Full performance history & stats'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <h3 className="text-xl font-bold mb-4">Trade Smarter, Not Harder</h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Copy trading removes emotional decision-making and replaces it with proven strategies. By following disciplined traders with consistent performance, you benefit from experience, strategy, and structure.</p>
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>All trading involves risk. Past performance does not guarantee future results. You have full control to stop, modify, or diversify your copied trades at any time.</p>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-lg font-semibold gold-shine-text">Choose a Trader. Set Risk. Copy Trades. Grow Together.</p>
          </div>
        </div>
      </section>

      {/* IB Program Section */}
      <section id="ib-program" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <BarChart3 size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">IB Program</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Forex Introducing Broker <span className="gold-shine-text">(IB) Program</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Earn Passive Income by Referring Forex Traders. Join our Forex IB Program and earn commissions by referring traders to our trading platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Join Our Forex IB Program?</h3>
              <ul className="space-y-4">
                {['High Commission Structure – Earn competitive rebates per lot', 'Lifetime Revenue – Get paid as long as your clients trade', 'Daily / Weekly Payouts – Fast and transparent payments', 'No Investment Required – Zero risk to join', 'Real-Time Tracking – Monitor clients, volume, and earnings', 'Multi-Level IB Support – Grow your network further'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Who Can Become an IB?</h3>
              <ul className="space-y-4">
                {['Forex traders and educators', 'Trading signal providers', 'Social media influencers', 'Telegram / WhatsApp trading groups', 'Website owners and marketers'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm italic" style={{ color: 'var(--text-muted)' }}>No license or prior experience required.</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { step: '1', title: 'Register as an IB', desc: 'Free and quick sign-up' },
              { step: '2', title: 'Get Your Referral Link', desc: 'Share with your audience' },
              { step: '3', title: 'Clients Trade', desc: 'Referred traders open and trade accounts' },
              { step: '4', title: 'You Earn Commission', desc: 'Automatically credited to your IB account' }
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold" style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#d4af37' }}>{item.step}</div>
                <h4 className="font-bold mb-2">{item.title}</h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Tools & Support for IB Partners</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>We provide dedicated IB dashboard, marketing materials & referral links, client activity and commission reports, and personal IB support team.</p>
            <p className="text-lg font-semibold gold-shine-text">Refer Traders. Earn Commissions. Build Long-Term Income.</p>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Shield size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">About Us</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">A Trusted Partner in <span className="gold-shine-text">Global Forex Trading</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              We are a technology-driven forex brokerage committed to providing traders with secure, transparent, and efficient access to the global financial markets.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Our Mission</h3>
              <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Our mission is to make forex trading accessible and efficient by delivering:</p>
              <ul className="space-y-4">
                {['Fast and reliable trade execution', 'Competitive spreads and flexible leverage', 'Secure fund handling and data protection', 'Professional, multilingual customer support'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm italic" style={{ color: 'var(--text-muted)' }}>We focus on long-term relationships, not short-term gains.</p>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Our Values</h3>
              <ul className="space-y-4">
                {['Transparency – Clear pricing, no hidden costs', 'Trust & Security – Client-first approach and secure systems', 'Innovation – Continuous improvement in technology and services', 'Client Success – Your growth is our success'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="p-8 rounded-3xl mb-12" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Trade With Us?</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['Advanced trading platforms (MT4 / MT5)', 'Deep liquidity and fast execution', 'Multiple account types for different trading styles', 'Dedicated customer and IB support', 'Education and tools to support trader growth'].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Our Vision</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Our vision is to become a globally recognized forex broker known for reliability, transparency, and trader satisfaction. We continuously evolve to meet the needs of modern traders in a fast-changing financial world.</p>
          </div>
        </div>
      </section>

      {/* Careers Section */}
      <section id="careers" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Users size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Careers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">Build Your Career in the <span className="gold-shine-text">Global Financial Markets</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Join a fast-growing, technology-driven financial company where innovation, integrity, and people come first.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Why Work With Us?</h3>
              <ul className="space-y-4">
                {['Dynamic and professional work environment', 'Exposure to global financial markets', 'Career growth and skill development opportunities', 'Competitive compensation packages', 'Performance-based rewards', 'Supportive and inclusive culture'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-xl font-bold mb-6 gold-shine-text">Who We're Looking For</h3>
              <ul className="space-y-4">
                {['Forex & financial market specialists', 'Sales & relationship managers', 'Customer support executives', 'Marketing & digital growth experts', 'Technology & platform support engineers', 'Compliance & operations professionals'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm italic" style={{ color: 'var(--text-muted)' }}>Whether you're experienced or just starting your career, we value talent, dedication, and a learning mindset.</p>
            </div>
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Grow With Us</h3>
            <p style={{ color: 'var(--text-secondary)' }}>We offer ongoing training, mentorship, and opportunities to work on innovative projects in the fast-evolving world of forex and financial technology. We invest in our people because their success drives our success.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <Globe size={16} style={{ color: '#d4af37' }} />
              <span className="text-sm font-medium gold-shine-text">Contact</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">We're Here to <span className="gold-shine-text">Help You</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Have questions about our trading services, accounts, partnerships, or platforms? Our support team is ready to assist you.
            </p>
          </div>
          
          <div className="p-8 rounded-3xl mb-8" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <h3 className="text-xl font-bold mb-6 gold-shine-text">Get in Touch</h3>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>You can reach us through the following channels:</p>
            <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <p className="font-medium mb-2">How to Contact Support:</p>
              <p style={{ color: 'var(--text-secondary)' }}>First sign up → Login to your account → Create a support ticket</p>
            </div>
            <p className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span>🕒</span> Support Hours: 24/5 (Market Hours)
            </p>
          </div>
          
          <div className="text-center p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(20, 20, 20, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
            <h3 className="text-xl font-bold mb-4">Customer Support Commitment</h3>
            <p style={{ color: 'var(--text-secondary)' }}>We are committed to providing fast, professional, and transparent support. Our team strives to resolve all inquiries efficiently and ensure a smooth trading experience for every client.</p>
          </div>
        </div>
      </section>

      {/* Terms of Service Section */}
      <section id="terms" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Legal Terms, Policies & <span className="gold-shine-text">Disclosures</span></h2>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">1. General Terms & Acceptance</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>These Terms govern access to and use of the services provided by Concorddex. By accessing our website, opening an account, or using any trading services, you agree to be bound by these Terms, Privacy Policy, Risk Disclosure, and AML Policy collectively. If you do not agree with any part, you must not use our services. To use Concorddex services, you must be at least 18 years of age, have legal capacity to enter into a binding agreement, and comply with all applicable laws and regulations in Concorddex's jurisdiction.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">2. Services, Trading Nature & Risk Acknowledgment</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Concorddex provides access to online forex and CFD trading platforms, market information, account tools, copy trading, and IB-related services strictly on an execution-only basis. Concorddex does not provide investment advice, portfolio management, profit guarantees, or financial recommendations. Forex, CFD, leveraged trading, copy trading, and related products involve high risk and may result in partial or total loss of invested capital.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">3. Copy Trading & IB Disclaimer</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Participation in copy trading or the Introducing Broker (IB) program is entirely optional and at the user's own risk. Concorddex does not control, manage, or guarantee the performance of any strategy provider, copied trader, or IB partner. Any profits, losses, commissions, or income expectations are not guaranteed.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">4. Account Responsibility, Privacy & Data Use</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>You are responsible for providing accurate registration information, safeguarding your login credentials, and all activities conducted under your account. Concorddex collects and processes personal, financial, and technical information solely for service delivery, compliance, security, and operational purposes.</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>This website is not directed at persons located in: Afghanistan, American Samoa, Australia, Belarus, Belgium, British Indian Ocean Territory, British Virgin Islands, Canada, Christmas Island, Cocos Islands, Congo, Cuba, Guam, Guinea, Haiti, Iran, Israel, Lebanon, Libya, Mali, Myanmar, New Zealand, North Korea, Northern Mariana Islands, India, Puerto Rico, Russian Federation, Singapore, Somalia, South Sudan, Sudan, Syria, Turkey, Ukraine, United States of America, US Minor Outlying Islands, US Virgin Islands.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">5. Overseas Persons</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Viewing the materials you are seeking to access may not be lawful in certain jurisdictions. Any person who wishes to view these materials must first satisfy themselves that they are not subject to any local requirements that prohibit or restrict them from doing so. Concorddex will not open an account for, and may block an existing account of, any person who is a resident of or is attempting to access our trading platform from a restricted country.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">6. AML, Compliance & Transaction Controls</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Concorddex follows strict Anti-Money Laundering (AML), Know Your Customer (KYC), and Counter-Terrorist Financing (CTF) standards. Deposits and withdrawals must be made from accounts in the client's own name, and third-party transactions are prohibited. Concorddex reserves the right to delay, reject, investigate, or report transactions suspected of fraud, money laundering, or regulatory violations without prior notice.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">7. Limitation of Liability & Legal Protection</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>To the maximum extent permitted by law, Concorddex shall not be liable for trading losses, indirect or consequential damages, technical failures, market volatility, third-party actions, copied trader performance, IB activities, or regulatory changes. Continued use of Concorddex services constitutes acceptance of these terms, which may be updated at any time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Policy Section */}
      <section id="privacy" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4"><span className="gold-shine-text">Privacy Policy</span></h2>
          </div>
          
          <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>Concorddex respects your privacy and is committed to protecting the personal information of all users who access our website or use our services. This Privacy Policy explains how Concorddex collects, uses, stores, shares, and safeguards your personal data when you interact with our platform.</p>
              
              <p>Concorddex may collect personal information such as your name, email address, phone number, residential address, date of birth, identification documents required for Know Your Customer (KYC) verification, payment and transaction details, trading account information, and other data necessary to provide our services.</p>
              
              <p>We use your information to provide and manage trading services, verify your identity, comply with legal and regulatory requirements, process deposits and withdrawals, improve our website and trading platforms, communicate important updates, provide customer support, prevent fraud, detect unauthorized activity, and ensure the safety and integrity of our systems.</p>
              
              <p>Concorddex uses cookies and similar tracking technologies to enhance user experience, analyze website traffic, and improve functionality. You may disable cookies through your browser settings; however, some features of the website may not function properly as a result.</p>
              
              <p>We implement reasonable technical and organizational security measures to protect your personal information from unauthorized access, misuse, loss, or alteration. While we take strong precautions to safeguard your data, no method of transmission or storage is completely secure.</p>
              
              <p>Concorddex does not sell, rent, or trade your personal information to third parties. We may share your information only with trusted service providers, payment processors, identity verification partners, or regulatory and legal authorities where required by law.</p>
              
              <p>We retain your personal information only for as long as necessary to fulfill business, legal, and regulatory requirements. Depending on applicable laws, you may have the right to access, update, correct, or request deletion of your personal data, subject to regulatory obligations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Disclosure Section */}
      <section id="risk-disclosure" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4"><span className="gold-shine-text">Risk Disclosure</span></h2>
          </div>
          
          <div className="p-8 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>Trading in foreign exchange (forex), contracts for difference (CFDs), and other leveraged financial instruments involves a high level of risk and may not be suitable for all investors. Before deciding to trade with Concorddex, you should carefully consider your investment objectives, level of experience, and risk tolerance. There is a possibility that you may lose some or all of your invested capital, and therefore you should not invest money that you cannot afford to lose.</p>
              
              <p>Forex and CFD trading are highly leveraged products, which means that small market movements can have a proportionally large impact on your trading account, potentially resulting in significant losses as well as gains. Leverage can work both for and against you, and losses may exceed your initial deposit. Market volatility, liquidity conditions, economic events, and geopolitical developments can cause rapid and unpredictable price movements.</p>
              
              <p>Past performance of any trading strategy, signal provider, copy trading strategy, or Introducing Broker does not guarantee future results. Concorddex does not provide investment advice, trading recommendations, or guarantees of profitability. Any information, analysis, or tools provided are for informational purposes only and should not be considered financial or investment advice.</p>
              
              <p>Copy trading involves additional risks, including the risk that the copied trader may make poor trading decisions, change strategies without notice, or experience losses that are automatically replicated in your account. You remain fully responsible for monitoring copied trades and managing your risk settings at all times.</p>
              
              <p>Trading platforms may experience technical failures, connectivity issues, delays, or interruptions beyond the control of Concorddex. Such events may affect order execution, pricing, or account access, and Concorddex shall not be liable for losses resulting from technical or system-related issues.</p>
              
              <p>By opening an account and trading with Concorddex, you acknowledge that you understand the risks involved in trading leveraged financial instruments, accept full responsibility for your trading decisions, and agree that Concorddex shall not be held liable for trading losses, missed profits, or other damages arising from your trading activities.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AML Policy Section */}
      <section id="aml-policy" className="py-20 sm:py-32 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4"><span className="gold-shine-text">AML Policy</span></h2>
            <p className="text-base sm:text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Concorddex is committed to preventing money laundering, terrorist financing, and other financial crimes in accordance with applicable laws and international regulatory standards.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">Purpose of the AML Policy</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li>• Prevent the use of Concorddex's services for money laundering or illegal activities</li>
                <li>• Comply with applicable AML, Counter-Terrorist Financing (CTF), and financial crime regulations</li>
                <li>• Protect the company, its clients, and the financial system from abuse</li>
              </ul>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">Customer Due Diligence (KYC)</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Concorddex follows strict Know Your Customer (KYC) procedures. Clients are required to provide accurate and complete personal information, including but not limited to identity documents, proof of address, and additional verification documents as requested.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">Deposits & Withdrawals Controls</h3>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li>• Deposits and withdrawals must be made using accounts registered in the client's own name</li>
                <li>• Third-party payments are not permitted</li>
                <li>• Withdrawals may only be processed to the original source of funds, where applicable</li>
              </ul>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">Suspicious Activity Reporting</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Concorddex reserves the right to investigate and report any suspicious activity to relevant regulatory or law enforcement authorities without notifying the client, where required by law. This may include activities suspected to involve fraud, money laundering, terrorist financing, or other illegal conduct.</p>
            </div>
            
            <div className="p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(20, 20, 20, 0.9) 0%, rgba(10, 10, 10, 0.9) 100%)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <h3 className="text-lg font-bold mb-4 gold-shine-text">Account Suspension or Termination</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Concorddex reserves the right to suspend, restrict, or terminate any account at its sole discretion if money laundering, fraudulent activity, or violation of AML regulations is suspected. Such actions may be taken without prior notice where legally permitted.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Premium Design */}
      <footer className="py-16 sm:py-20 px-4 sm:px-6 relative" style={{ background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <img src={concorddexLogo} alt="Concorddex" className="h-14 sm:h-16" />
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                Your trusted partner for global trading. Trade with confidence on the world's most advanced platform.
              </p>
              <div className="flex gap-4">
                {['Twitter', 'Discord', 'Telegram'].map((social, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110" style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <span className="text-xs font-bold" style={{ color: '#d4af37' }}>{social.charAt(0)}</span>
                  </a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Products</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#forex-trading" className="transition-colors hover:text-yellow-400">Forex Trading</a></li>
                <li><a href="#crypto-trading" className="transition-colors hover:text-yellow-400">Crypto Trading</a></li>
                <li><a href="#copy-trading" className="transition-colors hover:text-yellow-400">Copy Trading</a></li>
                <li><a href="#ib-program" className="transition-colors hover:text-yellow-400">IB Program</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Company</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#about-us" className="transition-colors hover:text-yellow-400">About Us</a></li>
                <li><a href="#careers" className="transition-colors hover:text-yellow-400">Careers</a></li>
                <li><a href="#contact" className="transition-colors hover:text-yellow-400">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-6 text-base gold-shine-text">Legal</h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><a href="#terms" className="transition-colors hover:text-yellow-400">Terms of Service</a></li>
                <li><a href="#privacy" className="transition-colors hover:text-yellow-400">Privacy Policy</a></li>
                <li><a href="#risk-disclosure" className="transition-colors hover:text-yellow-400">Risk Disclosure</a></li>
                <li><a href="#aml-policy" className="transition-colors hover:text-yellow-400">AML Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left" style={{ borderTop: '1px solid rgba(212, 175, 55, 0.1)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              © 2024 Concorddex.com. All rights reserved.
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Trading involves significant risk. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
