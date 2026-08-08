
import HUDOverlay from '../components/hud/HUDOverlay';
import GlitchText from '../components/hud/GlitchText';
import contactData from '../data/contact.json';
import './Contact.css';

export default function Contact() {
  return (
    <div className="contact-container">
      <HUDOverlay>
        <div className="contact-content">
          <div className="section-index">[03] CONTACT</div>
          
          <div className="contact-card">
            <div className="bracket top-left"></div>
            <div className="bracket top-right"></div>
            <div className="bracket bottom-left"></div>
            <div className="bracket bottom-right"></div>

            <GlitchText text="GET IN TOUCH" as="h1" className="contact-title" />
            
            <div className="contact-links">
              {contactData.map((contact, index) => {
                if (!contact.url) return null;
                return (
                  <a key={index} href={contact.url} target={contact.url.startsWith('mailto:') ? undefined : "_blank"} rel="noopener noreferrer" className="contact-pill">
                    {contact.platform.toUpperCase()}
                  </a>
                );
              })}
            </div>

            <div className="contact-hazard"></div>
          </div>
        </div>
      </HUDOverlay>
    </div>
  );
}
