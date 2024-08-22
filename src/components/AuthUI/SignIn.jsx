import React from 'react';
import { useTheme, View, Image } from '@aws-amplify/ui-react';
import textLogo from '../../assets/textlogo.png';

const Header = () => {
  const { tokens } = useTheme();

  return (
    <View style={{ textAlign: 'center', padding: tokens.space.large }}>
      <Image
        alt="Temporary logo"
        src={textLogo}
      />
    </View>
  );
};

export default Header;