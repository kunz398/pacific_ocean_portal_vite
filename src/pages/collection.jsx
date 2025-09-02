import React, { useEffect, useState } from 'react';
import { Container, Button, Form, InputGroup } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import '@/components/css/card.css';
import { useAuth } from '@/hooks/useAuth';
import { get_url } from '@/components/json/urls';

function Collections() {
    console.log('Collections component is rendering'); // Debug log
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');

                                               const { isLoggedin, country, token, isInitialized } = useAuth();

    useEffect(() => {
        // Don't fetch dashboards until auth is initialized
        if (!isInitialized) return;

        const fetchDashboards = async () => {
            setLoading(true);
            setError(null);
            try {
                const publicUrl = get_url('root-path') + '/middleware/api/widget/?format=json';
                console.log('Fetching from:', publicUrl); // Debug log
                const publicRes = await fetch(publicUrl);
                if (!publicRes.ok) throw new Error(`Failed to fetch public dashboards: ${publicRes.status}`);
                const publicDashboards = await publicRes.json();
                console.log('Public dashboards:', publicDashboards); // Debug log

                let countryDashboards = [];
                if (isLoggedin && country) {
                    
                    const countryUrl = get_url('root-path') + `/middleware/api/widget/?format=json&country_id=${country}`;
                    const headers = token ? { Authorization: `Bearer ${token}` } : {};
                    const countryRes = await fetch(countryUrl, { headers });
                    if (!countryRes.ok) throw new Error('Failed to fetch country dashboards');
                    countryDashboards = await countryRes.json();
                    console.log('Country dashboards:', countryDashboards); // Debug log
                }

                const dashboardsById = {};
                [...publicDashboards, ...countryDashboards].forEach(d => { dashboardsById[d.id] = d; });
                const allProjects = Object.values(dashboardsById);
                console.log('All projects:', allProjects); // Debug log
                setProjects(allProjects);
            } catch (err) {
                console.error('Error fetching dashboards:', err); // Debug log
                setError(err.message || 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboards();
    }, [token, country, isLoggedin, isInitialized]);

    const filteredProjects = projects.filter(card =>
        card.display_title && card.display_title.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mx-auto mt-5" style={{ maxWidth: '600px' }}>
                Error: {error}
            </div>
        );
    }

    // Open dashboard URL in new tab. component_name field holds URL.
    const handleDashboardClick = (componentName, card) => {
        if (!componentName) return;
        // If dashboard is restricted, construct secure URL with token & country codes
        // Assumes card.restricted (boolean) or card.is_restricted marks restricted dashboards.
        const isRestricted = card?.restricted === true || card?.is_restricted === true;
        if (isRestricted) {
            // Country code(s): API gives country (single) or card.countries (array) or card.country_codes
            let countryCodes = [];
            if (Array.isArray(card?.country_codes)) countryCodes = card.country_codes; 
            else if (Array.isArray(card?.countries)) countryCodes = card.countries.map(c => c.code || c.country_code || c.short_code).filter(Boolean);
            else if (typeof country === 'string' && country) countryCodes = [country];
            const countryParam = encodeURIComponent(countryCodes.join(','));
            const tokenParam = encodeURIComponent(token || '');
            // Base restricted pattern provided by user: https://ocean-plugin.spc.int/widget1/?token={}&country={}
            // If componentName already contains a protocol, treat it as base; else prepend.
            const baseUrl = componentName.startsWith('http://') || componentName.startsWith('https://')
                ? componentName.split('?')[0]
                : `https://ocean-plugin.spc.int/${componentName.replace(/^\//,'').split('?')[0]}`;
            const finalUrl = `${baseUrl}?token=${tokenParam}&country=${countryParam}`;
            window.open(finalUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        // Public / unrestricted: open as-is
        window.open(componentName, '_blank', 'noopener,noreferrer');
    };

    return (
        <>
           <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #e5e7eb;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #9ca3af;
          border-radius: 10px;
          transition: background 0.3s ease;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: #e5e7eb;
        }
        
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #9ca3af #e5e7eb;
        }
        
        /* Dark mode scrollbar styles */
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-track {
          background: #2a2a2a;
        }
        
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #555555;
        }
        
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #777777;
        }
        
        body.dark-mode .custom-scrollbar::-webkit-scrollbar-corner {
          background: #2a2a2a;
        }
        
        body.dark-mode .custom-scrollbar {
          scrollbar-color: #555555 #2a2a2a;
        }
          `}</style>
          <div className="custom-scrollbar" style={{ 
            minHeight: 'calc(100vh - 60px)', height: 'calc(100vh - 60px)'
        }}>
        <main className="py-4">
            <Container>
                <div className="mb-5">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                        <a href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
                            {/* Replace with your logo image or text as needed */}
                            {/* <img src="/COSPPac-Logo-Acronym-EDITED II.png" alt="Logo" style={{ height: '48px', cursor: 'pointer' }} /> */}
                        </a>
                        <h1 className="display-9 mb-0">Dashboard Collections</h1>
                    </div>
                    <div className="d-flex justify-content-center">
                        <Form className="mt-3" autoComplete="off" onSubmit={e => e.preventDefault()} style={{ width: '100%' }}>
                             <InputGroup id="dashboard-search-group">
                                 <InputGroup.Text
                                     style={{
                                         background: 'var(--color-surface, #fff)',
                                         border: '1px solid var(--color-secondary, #e5e7eb)',
                                         borderRight: 'none',
                                         paddingRight: 0,
                                         color: 'var(--color-secondary, #64748b)',
                                         borderTopLeftRadius: 12,
                                         borderBottomLeftRadius: 12,
                                         borderTopRightRadius: 0,
                                         borderBottomRightRadius: 0,
                                         boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                     }}
                                 >
                                     <FaSearch size={16} />
                                 </InputGroup.Text>
                                 <Form.Control
                                     type="text"
                                     placeholder="Search dashboards by title..."
                                     value={search}
                                     onChange={e => setSearch(e.target.value)}
                                     style={{
                                         border: '1px solid var(--color-secondary, #e5e7eb)',
                                         borderLeft: 'none',
                                         borderTopLeftRadius: 0,
                                         borderBottomLeftRadius: 0,
                                         borderTopRightRadius: 12,
                                         borderBottomRightRadius: 12,
                                         boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                         paddingLeft: 16,
                                         paddingRight: 16,
                                         paddingTop: 12,
                                         paddingBottom: 12,
                                         fontSize: '16px',
                                         background: 'var(--color-surface, #fff)',
                                         color: 'var(--color-text, #1e293b)',
                                     }}
                                 />
                            </InputGroup>
                        </Form>
                    </div>
                </div>

                <div className="row g-4">
                    {filteredProjects.length === 0 && !loading && (
                        <div className="col-12">
                            <div className="alert alert-info border border-info text-info text-center bg-transparent">
                                {projects.length === 0 ? 'No dashboards available. This could be due to network issues or the API being unavailable.' : 'No dashboards match your search.'}
                                {error && <><br/>Error details: {error}</>}
                            </div>
                        </div>
                    )}
                    {filteredProjects.map(card => (
                        <div key={card.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                            <div className="card h-100 shadow-sm border-0 overflow-hidden">
                                <div className="card-img-top overflow-hidden" style={{ height: '180px' }}>
                                    <img
                                        src={card.display_image_url}
                                        className="w-100 h-100 object-cover"
                                        alt={card.display_title}
                                    />
                                </div>
                                <div className="card-body d-flex flex-column">
                                    <h5 className="card-title fw-bold mb-3 text-truncate">
                                        {card.display_title}
                                    </h5>
                                    <div className="mb-3">
                                        <p className="mb-1 small text-muted">
                                            <span className="fw-semibold">Project:</span> {card.project.project_code}
                                        </p>
                                        <p className="mb-0 small text-muted">
                                            <span className="fw-semibold">Maintainer:</span> {card.maintainer}
                                        </p>
                                    </div>
                                    {card.component_name ? (
                                        <Button
                                            variant="primary"
                                            className="w-100 d-flex align-items-center justify-content-center py-2 mt-auto"
                                            style={{
                                                backgroundColor: '#4a6bff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onClick={() => handleDashboardClick(card.component_name, card)}
                                        >
                                            Explore Dashboard
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            className="w-100 d-flex align-items-center justify-content-center py-2 mt-auto"
                                            style={{
                                                border: 'none',
                                                borderRadius: '8px',
                                                transition: 'all 0.3s ease'
                                            }}
                                            disabled
                                        >
                                            No Dashboard Available
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Container>
            <style>{`
                /* Dark mode styles */
                body.dark-mode .display-9,
                body.dark-mode h1,
                body.dark-mode h2,
                body.dark-mode h3,
                body.dark-mode h4,
                body.dark-mode h5,
                body.dark-mode h6,
                body.dark-mode p,
                body.dark-mode span,
                body.dark-mode .card-title,
                body.dark-mode .card-text,
                body.dark-mode .text-muted {
                  color: #ffffff !important;
                }
                
                body.dark-mode .card {
                  background-color: var(--color-surface, #374151) !important;
                  border-color: var(--color-border, #6b7280) !important;
                  color: #ffffff !important;
                }
                
                body.dark-mode .card-body {
                  color: #ffffff !important;
                }
                
                body.dark-mode .small.text-muted {
                  color: #d1d5db !important;
                }
                
                body.dark-mode .fw-semibold {
                  color: #ffffff !important;
                }

                body.dark-mode .alert-danger {
                  background-color: rgba(220, 38, 38, 0.1) !important;
                  border-color: #dc2626 !important;
                  color: #ffffff !important;
                }

                /* Ensure spinner is visible in dark mode */
                body.dark-mode .spinner-border {
                  color: #60a5fa !important;
                }

                /* Loading text in dark mode */
                body.dark-mode div[style*="textAlign: center"] {
                  color: #ffffff !important;
                }

                /* Search input dark mode styling */
                body.dark-mode .form-control {
                  background-color: var(--color-surface, #374151) !important;
                  border-color: var(--color-border, #6b7280) !important;
                  color: #ffffff !important;
                }

                body.dark-mode .form-control::placeholder {
                  color: #9ca3af !important;
                }

                body.dark-mode .input-group-text {
                  background-color: var(--color-surface, #374151) !important;
                  border-color: var(--color-border, #6b7280) !important;
                  color: #9ca3af !important;
                }

                /* Main container dark mode */
                body.dark-mode main {
                  background-color: var(--color-background, #1f2937) !important;
                  color: #ffffff !important;
                }
            `}</style>
        </main>
        </div>
        </>
    );
}

export default Collections;