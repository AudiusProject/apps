import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { IconArrowLeft } from '@audius/harmony-native';
export var BackButton = function () {
    var navigation = useNavigation();
    return (<TouchableOpacity onPress={navigation.goBack}>
      <IconArrowLeft size='l' color='subdued'/>
    </TouchableOpacity>);
};
