import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Spinner } from 'react-bootstrap';

const Library = () => {
  const [countryFilter, setCountryFilter] = useState('All');
  const [documentTypeFilter, setDocumentTypeFilter] = useState(null);
  const [yearFilter, setYearFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    documentTypes: [],
    years: []
  });
  const [loading, setLoading] = useState(true);

  const BASE_URL = 'https://ocean-library.spc.int';
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [countriesRes, documentTypesRes, yearsRes] = await Promise.all([
          fetch(`${BASE_URL}/library/countries/`),
          fetch(`${BASE_URL}/library/document-types/`),
          fetch(`${BASE_URL}/library/years/`)
        ]);
        
        const [countriesData, documentTypesData, yearsData] = await Promise.all([
          countriesRes.json(),
          documentTypesRes.json(),
          yearsRes.json()
        ]);
        
        setFilterOptions({
          countries: countriesData,
          documentTypes: documentTypesData,
          years: yearsData
        });

        // Set default values to first document type if available
        if (documentTypesData.length > 0) {
          setDocumentTypeFilter(documentTypesData[0].id);
        }

        // Build initial URL with default document type if available
        let initialUrl = `${BASE_URL}/library/documents/`;
        if (documentTypesData.length > 0) {
          initialUrl += `?document_type_id=${documentTypesData[0].id}`;
        }
        
        const docsRes = await fetch(initialUrl);
        const docsData = await docsRes.json();
        setDocuments(docsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (documentTypeFilter === null) return;

    const fetchFilteredDocuments = async () => {
      try {
        setLoading(true);
        let url = `${BASE_URL}/library/documents/?`;
        
        if (countryFilter !== 'All') url += `country_id=${encodeURIComponent(countryFilter)}&`;
        if (documentTypeFilter !== 'All') url += `document_type_id=${encodeURIComponent(documentTypeFilter)}&`;
        if (yearFilter !== 'All') url += `year_id=${encodeURIComponent(yearFilter)}`;
        
        url = url.endsWith('&') ? url.slice(0, -1) : url;
        
        const response = await fetch(url);
        const data = await response.json();
        setDocuments(data);
      } catch (error) {
        console.error('Error fetching filtered documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredDocuments();
  }, [countryFilter, documentTypeFilter, yearFilter]);

  const filteredDocuments = documents.filter(doc => {
    return doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           doc.country.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getFullMediaUrl = (path) => {
    return path.startsWith('http') ? path : `${BASE_URL}${path}`;
  };

  if (loading && documents.length === 0) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p>Loading documents...</p>
      </Container>
    );
  }

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

        /* Responsive Grid Layout */
        .cards {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1.25rem;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        @media (max-width: 1400px) {
          .cards {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem;
          }
        }

        @media (max-width: 1200px) {
          .cards {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
          }
        }

        @media (max-width: 900px) {
          .cards {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
        }

        @media (max-width: 600px) {
          .cards {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        /* Card Styling */
        .card {
          aspect-ratio: 1;
          height: 240px;
          border-top-left-radius: 16px;
          border-bottom-right-radius: 16px;
          overflow: hidden;
          position: relative;
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
          border: none;
          margin-bottom: 0;
          max-width: 100%;
        }

        /* Responsive Card Sizing */
        @media (max-width: 1400px) {
          .card {
            height: 220px;
          }
        }

        @media (max-width: 1200px) {
          .card {
            height: 200px;
          }
        }

        @media (max-width: 992px) {
          .card {
            height: 180px;
          }
        }

        @media (max-width: 768px) {
          .card {
            height: 160px;
          }
        }

        @media (max-width: 576px) {
          .card {
            height: 140px;
          }
        }

        /* Responsive Typography */
        .card--title {
          padding: 0.5rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #fff;
          text-transform: capitalize;
          line-height: 1.2;
          text-shadow: 0 2px 4px rgba(0,0,0,0.7);
          margin: 0;
          position: relative;
          z-index: 2;
          top: 50%;
        }

        @media (max-width: 1400px) {
          .card--title {
            font-size: 0.75rem;
            padding: 0.4rem;
            max-width: 7ch;
          }
        }

        @media (max-width: 992px) {
          .card--title {
            font-size: 0.7rem;
            padding: 0.3rem;
            max-width: 6ch;
          }
        }

        @media (max-width: 768px) {
          .card--title {
            font-size: 0.65rem;
            padding: 0.3rem;
            max-width: 5ch;
          }
        }

        @media (max-width: 576px) {
          .card--title {
            font-size: 0.6rem;
            padding: 0.2rem;
            max-width: 4ch;
          }
        }

        /* Responsive Tags */
        .card--hashtag {
          position: absolute;
          display: flex;
          flex-direction: column;
          padding: 6px 6px 6px 0;
          background: var(--color-surface, #fff);
          border-top-right-radius: 16px;
          bottom: 0;
          left: 0;
          gap: 0.2rem;
          max-width: 85%;
          z-index: 2;
        }

        @media (max-width: 1400px) {
          .card--hashtag {
            padding: 5px 5px 5px 0;
            gap: 0.15rem;
            max-width: 82%;
          }
        }

        @media (max-width: 992px) {
          .card--hashtag {
            padding: 4px 4px 4px 0;
            gap: 0.15rem;
            max-width: 80%;
          }
        }

        @media (max-width: 768px) {
          .card--hashtag {
            padding: 3px 3px 3px 0;
            gap: 0.1rem;
            max-width: 75%;
          }
        }

        @media (max-width: 576px) {
          .card--hashtag {
            padding: 2px 2px 2px 0;
            gap: 0.1rem;
            max-width: 70%;
          }
        }

        .card--hashtag span {
          margin: 0;
          padding: 2px 5px;
          border: 1px solid var(--color-secondary, #1d1d1d);
          border-radius: 100px;
          z-index: 1;
          font-size: 0.6rem;
          font-weight: 500;
          color: var(--color-text, #1d1d1d);
          background: var(--color-surface, #fff);
          white-space: nowrap;
          width: fit-content;
        }

        @media (max-width: 1400px) {
          .card--hashtag span {
            font-size: 0.55rem;
            padding: 2px 4px;
          }
        }

        @media (max-width: 992px) {
          .card--hashtag span {
            font-size: 0.5rem;
            padding: 1px 3px;
          }
        }

        @media (max-width: 768px) {
          .card--hashtag span {
            font-size: 0.45rem;
            padding: 1px 3px;
          }
        }

        @media (max-width: 576px) {
          .card--hashtag span {
            font-size: 0.4rem;
            padding: 1px 2px;
          }
        }

        /* Responsive View PDF Button */
        .card--more {
          position: absolute;
          display: flex;
          padding: 6px 6px 6px 0;
          border-bottom-left-radius: 16px;
          background: var(--color-surface, #fff);
          top: 0;
          right: 0;
          z-index: 2;
        }

        @media (max-width: 1400px) {
          .card--more {
            padding: 5px 5px 5px 0;
          }
        }

        @media (max-width: 992px) {
          .card--more {
            padding: 4px 4px 4px 0;
          }
        }

        @media (max-width: 768px) {
          .card--more {
            padding: 3px 3px 3px 0;
          }
        }

        @media (max-width: 576px) {
          .card--more {
            padding: 2px 2px 2px 0;
          }
        }

        .card--more a {
          margin: 0 0 0 6px;
          padding: 5px 10px;
          background: #ff8c00;
          color: #fff;
          font-weight: 600;
          text-decoration: none;
          border: none;
          border-radius: 100px;
          z-index: 1;
          font-size: 0.7rem;
          transition: all 0.3s ease;
        }

        @media (max-width: 1400px) {
          .card--more a {
            padding: 4px 8px;
            font-size: 0.65rem;
            margin: 0 0 0 5px;
          }
        }

        @media (max-width: 992px) {
          .card--more a {
            padding: 3px 6px;
            font-size: 0.6rem;
            margin: 0 0 0 4px;
          }
        }

        @media (max-width: 768px) {
          .card--more a {
            padding: 2px 5px;
            font-size: 0.55rem;
            margin: 0 0 0 3px;
          }
        }

        @media (max-width: 576px) {
          .card--more a {
            padding: 2px 4px;
            font-size: 0.5rem;
            margin: 0 0 0 2px;
          }
        }

        /* Responsive Layout Adjustments */
        @media (max-width: 768px) {
          .container-fluid {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          .d-flex.justify-content-between.align-items-center {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 1rem;
          }
          
          .d-flex.align-items-center {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.5rem;
          }
          
          .form-control {
            width: 100% !important;
            max-width: none;
          }
        }

        @media (max-width: 576px) {
          .container-fluid {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
          
          .d-flex.justify-content-between.align-items-center {
            gap: 0.75rem;
          }
          
          .d-flex.align-items-center {
            gap: 0.4rem;
          }
        }

        /* Hover Effects */
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .card--more a:hover {
          background: var(--color-accent, #f59e42);
          color: #fff;
          transform: scale(1.05);
        }

        /* Geometric Cutout Styles */
        .card--hashtag::before,
        .card--hashtag::after {
          z-index: 0;
        }

        .card--hashtag::before {
          position: absolute;
          content: "";
          top: -16px;
          left: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: var(--color-surface, #fff);
          border-bottom-color: var(--color-surface, #fff);
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(90deg);
        }

        .card--hashtag::after {
          position: absolute;
          content: "";
          bottom: -16px;
          right: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: var(--color-surface, #fff);
          border-bottom-color: var(--color-surface, #fff);
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(90deg);
        }

        .card--more::before,
        .card--more::after {
          z-index: 0;
        }

        .card--more::before {
          position: absolute;
          content: "";
          top: -16px;
          left: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: var(--color-surface, #fff);
          border-bottom-color: var(--color-surface, #fff);
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(-90deg);
        }

        .card--more::after {
          position: absolute;
          content: "";
          bottom: -16px;
          right: -16px;
          background: transparent;
          width: 16px;
          height: 16px;
          border-top-color: transparent;
          border-left-color: transparent;
          border-right-color: var(--color-surface, #fff);
          border-bottom-color: var(--color-surface, #fff);
          border-bottom-right-radius: 16px;
          border-width: 16px;
          border-style: solid;
          transform: rotate(-90deg);
        }

        /* Dark mode adjustments for cards */
        body.dark-mode .card--hashtag {
          background: #2e2f33 !important;
        }

        body.dark-mode .card--hashtag::before,
        body.dark-mode .card--hashtag::after {
          border-right-color: #2e2f33 !important;
          border-bottom-color: #2e2f33 !important;
        }

        body.dark-mode .card--hashtag span {
          border-color: #44454a;
          color: #f1f5f9;
          background: #3f4854;
        }

        body.dark-mode .card--more {
          background: #3f4854 !important;
        }

        body.dark-mode .card--more::before,
        body.dark-mode .card--more::after {
          border-right-color: #3f4854 !important;
          border-bottom-color: #3f4854 !important;
        }

        body.dark-mode .card--more a {
          background: #ff8c00;
          color: #fff;
        }

        body.dark-mode .card--more a:hover {
          background: #e67e00;
          color: #fff;
        }

        /* Dark mode select arrow styling */
        body.dark-mode .form-select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m1 6 7 7 7-7'/%3e%3c/svg%3e") !important;
          background-repeat: no-repeat !important;
          background-position: right 0.75rem center !important;
          background-size: 16px 12px !important;
        }

        /* Change View PDF button color to orange */
        .card--more a {
          background: #ff8c00 !important;
          color: #fff !important;
        }

        .card--more a:hover {
          background: #e67e00 !important;
          color: #fff !important;
          transform: scale(1.05);
        }

        /* Dark mode View PDF button */
        body.dark-mode .card--more a {
          background: #ff8c00 !important;
          color: #fff !important;
        }

        body.dark-mode .card--more a:hover {
          background: #e67e00 !important;
          color: #fff !important;
        }

        /* Dark mode text styling for no results message */
        body.dark-mode .text-center h4,
        body.dark-mode .text-center p {
          color: #ffffff !important;
        }
      `}</style>
      
      <Container fluid className="py-4">
        <Row>
          <Col md={3} className="pe-4">
              <Card className="sticky-top" style={{ top: '20px', width: '100%', height: '318px', overflow: 'auto' }}>
                <Card.Body>
                  <Card.Title className="mb-3">Filters</Card.Title>
                  <Form>
                    <Form.Group controlId="countryFilter" className="mb-3">
                      <Form.Label>Country</Form.Label>
                      <Form.Select 
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                      >
                        <option value="All">All Countries</option>
                        {filterOptions.countries.map((country) => (
                          <option 
                            key={country.id} 
                            value={country.id}
                          >
                            {country.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group controlId="documentTypeFilter" className="mb-3">
                      <Form.Label>Document Type</Form.Label>
                      <Form.Select 
                        value={documentTypeFilter || (filterOptions.documentTypes[0]?.id || '')}
                        onChange={(e) => setDocumentTypeFilter(e.target.value)}
                      >
                        {filterOptions.documentTypes.map((type) => (
                          <option 
                            key={type.id} 
                            value={type.id}
                          >
                            {type.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group controlId="yearFilter">
                      <Form.Label>Year</Form.Label>
                      <Form.Select 
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                      >
                        <option value="All">All Years</option>
                        {filterOptions.years.map((year) => (
                          <option 
                            key={year.id} 
                            value={year.id}
                          >
                            {year.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col md={9}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Library</h1>
                <div className="d-flex align-items-center">
                  <div className="text-muted me-3">
                    {loading ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <strong>{filteredDocuments.length}</strong>
                    )}{' '}
                    {filteredDocuments.length === 1 ? 'document' : 'documents'} found
                  </div>
                  <Form.Group controlId="searchQuery" className="mb-0">
                    <Form.Control
                      type="text"
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '250px' }}
                    />
                  </Form.Group>
                </div>
              </div>

              {loading && documents.length > 0 ? (
                <div className="text-center py-3">
                  <Spinner animation="border" />
                  <p>Updating results...</p>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="row g-4">
                  {filteredDocuments.map((doc, index) => (
                    <div key={doc.id || index} className="col-12 col-sm-6 col-lg-4 col-xl" style={{ flex: '0 0 18%', maxWidth: '18%', margin: '0 1%', marginBottom: '1.5rem' }}>
                      <div 
                        className="card"
                        aria-label={doc.title}
                        style={{ 
                          backgroundImage: `url('${getFullMediaUrl(doc.image)}')` 
                        }}
                      >
                        <h3 className="card--title">{doc.title}</h3>
                        <div className="card--hashtag">
                          <span>{doc.year?.name}</span>
                          <span>{doc.document_type?.name}</span>
                          <span>{doc.country?.name}</span>
                        </div>
                        <div className="card--more">
                          <a 
                            href={getFullMediaUrl(doc.pdf)}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="card--more__link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <h4>No documents found matching your criteria</h4>
                  <p>Try adjusting your filters or search query</p>
                </div>
              )}
            </Col>
          </Row>
        </Container>
    </>
  );
};

export default Library;
