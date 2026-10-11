// HTML-escapes a string so it can never be interpreted as markup if it ends
// up rendered somewhere that doesn't already escape it by default. React
// escapes text content automatically, so this isn't strictly needed for the
// current client - but it's cheap insurance for any other consumer of this
// data (a CSV export, a different admin panel, an email template) that
// might not.
//
// Applied to: fullName (registration), and gig title/description/category.
// These are all free text a user chose that other users will see rendered
// back somewhere (a gig listing, a booking, an admin user list).
//
// Never apply this to email or password: escaping a password before it's
// hashed would silently change the password the user actually set;
// escaping an email risks breaking a technically-valid address and gains
// nothing, since emails are never rendered as HTML.
const escapeHtml = (value) => {
    if (typeof value !== 'string') return value;

    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

module.exports = { escapeHtml };
