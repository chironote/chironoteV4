import React from 'react';
import { useTheme, View, Image } from '@aws-amplify/ui-react';
import textLogo from '../../assets/fulllogo.svg';

const Header = () => {
  const { tokens } = useTheme();

  return (
    <View style={{ textAlign: 'center', width: '100%', padding: tokens.space.large }}>
      <Image
        alt="ChiroNote"
        src={textLogo}
      />
      <View style={{ 
        color: '#006400',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        marginTop: tokens.space.medium
      }}>
        HIPAA compliant software
      </View>
    </View>
  );
};

export default Header;
