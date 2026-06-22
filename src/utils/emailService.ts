import nodemailer from 'nodemailer';

let transporterInstance: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (!transporterInstance) {
    const host = process.env.EMAIL_HOST;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !user || !pass) {
      console.warn("Email credentials incomplete or missing. Workflow logs will be printed to console.");
      return null;
    }

    const port = parseInt(process.env.EMAIL_PORT || '587');
    const isSecure = process.env.EMAIL_SECURE === 'true' || port === 465;

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
  return transporterInstance;
}

const getSenderAddress = (): string => {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@cfao.com';
  const company = process.env.COMPANY_NAME || 'CFAO Automotive';
  return `"${company}" <${fromEmail}>`;
};

const getAppUrl = (): string => {
  return process.env.VITE_APP_URL || process.env.APP_URL || '';
};

export const sendNewReclamationNotification = async (numero: string, details: any) => {
  const transporter = getTransporter();
  const company = process.env.COMPANY_NAME || 'CFAO Automotive';
  const appUrl = getAppUrl();
  const destEmail = 'chef.atelier@cobail-auto.fr';

  const userNotifySubject = `[${company}] Confirmation d'enregistrement - Dossier N° ${numero}`;
  const userNotifyBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">${company} - Service Après-Vente</h2>
      <p>Bonjour <strong>${details.client_nom || 'Client'}</strong>,</p>
      <p>Nous vous confirmons que votre réclamation concernante le véhicule <strong>${details.modele_vehicule || ''}</strong> (Plaque: ${details.plaque_immatriculation || 'Non spécifiée'}) a bien été enregistrée sous la référence unique :</p>
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px; font-weight: bold; font-family: monospace; text-align: center; font-size: 18px; margin: 15px 0; border-radius: 6px; color: #0f172a;">
        ${numero}
      </div>
      <p><strong>Motif de la demande :</strong> ${details.motif || ''}</p>
      <p>Un conseiller technique va prendre en charge votre dossier très prochainement pour effectuer le diagnostic réseau.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748b;">Ceci est un message automatique, merci de ne pas y répondre directement. Pour tout complément, veuillez mentionner le numéro de dossier.</p>
    </div>
  `;

  const staffNotifySubject = `[${company} Alerte] Nouvelle réclamation à attribuer - ${numero}`;
  const staffNotifyBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #6b21a8; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Alerte Dispatcher - Atelier</h2>
      <p>Une nouvelle demande client d'immatriculation <strong>${details.plaque_immatriculation || 'N/A'}</strong> a été enregistrée par le Call Center.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
         <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold; width: 130px;">Dossier N° :</td><td style="padding: 8px;">${numero}</td></tr>
         <tr><td style="padding: 8px; font-weight: bold;">Client :</td><td style="padding: 8px;">${details.client_nom || ''} (Tél: ${details.client_telephone || ''})</td></tr>
         <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Véhicule :</td><td style="padding: 8px;">${details.modele_vehicule || ''} (VIN: ${details.vin || ''})</td></tr>
         <tr><td style="padding: 8px; font-weight: bold;">Urgence :</td><td style="padding: 8px;"><span style="color: red; font-weight: bold;">${details.urgence || 'moyen'}</span></td></tr>
         <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Symptôme :</td><td style="padding: 8px;">${details.motif || ''}</td></tr>
      </table>
      <p><em>Description : ${details.description || ''}</em></p>
      <div style="margin-top: 20px;">
         <a href="${appUrl}/dashboard-chef" style="background-color: #7c3aed; color: white; padding: 10px 18px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">Accéder au dispatcher d'atelier</a>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      const sender = getSenderAddress();
      // 1. Send confirmation to the client if email is valid
      if (details.client_email && details.client_email.includes('@')) {
        await transporter.sendMail({
          from: sender,
          to: details.client_email,
          subject: userNotifySubject,
          html: userNotifyBody,
        });
        console.log(`Email de confirmation envoyé au client : ${details.client_email}`);
      }

      // 2. Send dispatch alert to Chef d'Atelier
      await transporter.sendMail({
        from: sender,
        to: destEmail,
        subject: staffNotifySubject,
        html: staffNotifyBody,
      });
      console.log(`Alerte dispatch envoyée au Chef d'Atelier : ${destEmail}`);
    } catch (error) {
      console.error('Erreur lors du traitement d\'envois emails:', error);
    }
  } else {
    console.log(`[Email Simulation Log] Dossier client ${numero} créé.`);
    console.log(`[Client Email Simulation] To: ${details.client_email} | Subject: ${userNotifySubject}`);
    console.log(`[Staff Email Simulation] To: ${destEmail} | Subject: ${staffNotifySubject}`);
  }
};

export const sendAssignmentNotification = async (numero: string, conseillerEmail: string, conseillerNom: string, details: any) => {
  const transporter = getTransporter();
  const company = process.env.COMPANY_NAME || 'CFAO Automotive';
  const appUrl = getAppUrl();

  const subject = `[${company} Assignation] Nouveau dossier SAV attribué - ${numero}`;
  const body = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
      <h2 style="color: #d97706; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Assignation de Dossier SAV</h2>
      <p>Bonjour <strong>${conseillerNom}</strong>,</p>
      <p>Le Chef d'Atelier vient de vous attribuer la réclamation suivante pour expertise et suivi technique :</p>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
         <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold; width: 130px;">Dossier N° :</td><td style="padding: 8px;">${numero}</td></tr>
         <tr><td style="padding: 8px; font-weight: bold;">Client :</td><td style="padding: 8px;">${details.client_nom || ''} (Tél: ${details.client_telephone || ''})</td></tr>
         <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Véhicule :</td><td style="padding: 8px;">${details.modele_vehicule || ''} (Immat: ${details.plaque_immatriculation || ''})</td></tr>
         <tr><td style="padding: 8px; font-weight: bold;">Motif :</td><td style="padding: 8px;">${details.motif || ''}</td></tr>
      </table>
      <div style="margin-top: 20px;">
         <a href="${appUrl}/dashboard-conseiller" style="background-color: #d97706; color: white; padding: 10px 18px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">Traiter dans mon espace conseiller</a>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: getSenderAddress(),
        to: conseillerEmail,
        subject,
        html: body,
      });
      console.log(`Email d'affectation envoyé au conseiller : ${conseillerEmail}`);
    } catch (error) {
      console.error('Erreur email affectation:', error);
    }
  } else {
    console.log(`[Email Simulation Log] Dossier ${numero} assigné à ${conseillerNom} (${conseillerEmail}).`);
  }
};

export const sendStatusChangeNotification = async (numero: string, statut: string, details: any, isGarantieTransfer?: boolean) => {
  const transporter = getTransporter();
  const company = process.env.COMPANY_NAME || 'CFAO Automotive';
  const appUrl = getAppUrl();
  const sender = getSenderAddress();

  if (isGarantieTransfer) {
    const toEmail = 'garantie@cobail-auto.fr';
    const subject = `[${company} Garantie] Demande de prise en charge constructeur - ${numero}`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Alerte Service Garantie Constructeur</h2>
        <p>Une demande de couverture de garantie a été soumise par l'équipe technique d'atelier pour le véhicule immatriculé <strong>${details.plaque_immatriculation || 'N/A'}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
           <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold; width: 130px;">Dossier N° :</td><td style="padding: 8px;">${numero}</td></tr>
           <tr><td style="padding: 8px; font-weight: bold;">Client :</td><td style="padding: 8px;">${details.client_nom || ''}</td></tr>
           <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Modèle & VIN :</td><td style="padding: 8px;">${details.modele_vehicule || ''} (VIN: ${details.vin || ''})</td></tr>
           <tr><td style="padding: 8px; font-weight: bold;">Symptôme :</td><td style="padding: 8px;">${details.motif || ''}</td></tr>
        </table>
        <div style="margin-top: 20px;">
           <a href="${appUrl}/dashboard-garantie" style="background-color: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">Instruire le dossier de garantie</a>
        </div>
      </div>
    `;

    if (transporter) {
      try {
        await transporter.sendMail({ from: sender, to: toEmail, subject, html: body });
        console.log(`Notification envoyée au service garantie pour le dossier ${numero}`);
      } catch (error) {
        console.error('Erreur email garantie:', error);
      }
    } else {
      console.log(`[Email Simulation Log] Dossier ${numero} transmis au service Garantie.`);
    }
    return;
  }

  // If technical closure is triggerred, let's notify the CSI team as well!
  if (statut === 'cloture_technique') {
    const toEmail = 'csi@cobail-auto.fr';
    const subject = `[${company} Qualité] Prêt pour enquête de satisfaction CSI - ${numero}`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
        <h2 style="color: #0d9488; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Alerte Service Qualité & CSI</h2>
        <p>Bonjour,</p>
        <p>Le dossier de réclamation <strong>${numero}</strong> a été résolu techniquement en atelier.</p>
        <p>Vous pouvez dès à présent entamer l'enquête de satisfaction client (CSI), loguer les notes de satisfaction et valider la clôture définitive du dossier.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px;">
           <tr><td style="padding: 8px; font-weight: bold; width: 130px;">Client :</td><td style="padding: 8px;">${details.client_nom || ''} (Tél: ${details.client_telephone || ''})</td></tr>
           <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Véhicule :</td><td style="padding: 8px;">${details.modele_vehicule || ''} (Immat: ${details.plaque_immatriculation || ''})</td></tr>
        </table>
        <div style="margin-top: 20px;">
           <a href="${appUrl}/dashboard-csi" style="background-color: #0d9488; color: white; padding: 10px 18px; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 13px;">Lancer l'Enquête CSI</a>
        </div>
      </div>
    `;

    if (transporter) {
      try {
        await transporter.sendMail({ from: sender, to: toEmail, subject, html: body });
        console.log(`Notification envoyée au service CSI pour le dossier ${numero}`);
      } catch (error) {
        console.error('Erreur email CSI:', error);
      }
    } else {
      console.log(`[Email Simulation Log] Dossier ${numero} clôturé techniquement. Prêt pour l'enquête CSI.`);
    }
  }
};

