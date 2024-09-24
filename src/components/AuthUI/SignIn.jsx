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
    </View>
  );
};

export default Header;