import React from 'react';
import { useTheme, View, Image } from '@aws-amplify/ui-react';
import textLogo from '../../assets/textlogo-clr.svg';

const Header = () => {
  const { tokens } = useTheme();

  return (
    <View style={{ 
      textAlign: 'center', 
      width: '100%', 
      padding: `${tokens.space.medium} ${tokens.space.large}`,
      paddingBottom: tokens.space.small
    }}>
      <Image
        alt="ChiroNote"
        src={textLogo}
        style={{
          maxWidth: '220px',
          width: '100%',
          height: 'auto'
        }}
      />
      <View style={{ 
        color: '#006400',
        fontSize: '0.95rem',
        fontWeight: '600',
        marginTop: tokens.space.xs
      }}>
        HIPAA compliant software
      </View>
    </View>
  );
};

export default Header;
