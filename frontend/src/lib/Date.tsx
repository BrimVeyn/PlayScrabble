import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc);

export default function timeNow() {
	return dayjs.utc().format('YYYY:MM:DD HH:mm:ss');
}
