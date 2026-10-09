// Metro resolves `react-native-linear-gradient` here so dependencies that
// still import it (react-native-gifted-charts) render our svg gradient.
import { LinearGradient } from 'app/harmony-native/components/LinearGradient/LinearGradient'

export { LinearGradient }
export default LinearGradient
