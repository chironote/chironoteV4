import React, { useEffect, useState } from 'react';
import { Auth } from 'aws-amplify';
import './PriceTable.css';

const StripePricingTable = ({ onBack }) => {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        const { attributes } = user;
        setUserEmail(attributes.email);
        console.log(userEmail);
      } catch (error) {
        console.error('Error fetching user email:', error);
      }
    };

    fetchUserEmail();
  }, []);

  return (
    <>
      <button onClick={onBack} className="back-button">Back to Account Management</button>
      <div className="pricing-table-container">
        <stripe-pricing-table
          pricing-table-id="prctbl_1PnBmnGW9XarT1STkRJVEynp"
          publishable-key="pk_test_51OjRoLGW9XarT1STitbive9uLi8wemvrnBWCom1352qFV0pu87IzzFmE3eO1zxy4Qb8bA3xMwMojxMNUdVFoRnqX00j72cKeAO"
          customer-email={userEmail}
        />
      </div>
    </>
  );
};

export default StripePricingTable;