module.exports = function FlyMore(mod) {
	const CATEGORY_GLOBAL = 9999
	const SKILL_FLYING_DISMOUNT = 65000001
	
	let gameId = -0n,
		location = null,
		outOfEnergy = false,
		dismountByUser = false,
		mountDisabled = false,
		inCombat = false,
		mountSkill = -1,
		serverMounted = false,
		remountTimer = null
	
	mod.hook('C_PLAYER_FLYING_LOCATION', 4, (event) => {
		location = {
			flying: true,
			pos: event.loc,
			dir: event.w
		}
		
		if (outOfEnergy && event.type !== 7 && event.type !== 8) {
			event.type = 7
			return true
		}
	})
	
	mod.hook('C_PLAYER_LOCATION', 5, (event) => {
		location = {
			flying: false,
			pos: event.loc,
			dir: event.w
		}
	})
	
	mod.hook('C_START_SKILL', 7, (event) => {
		if (event.skill.id == mountSkill || event.skill.id == SKILL_FLYING_DISMOUNT) {
			dismountByUser = true
			mountSkill = -1
		}
	})
	
	mod.hook('S_CANT_FLY_ANYMORE', 1, (event) => {
		return false
	})
	
	mod.hook('S_MOUNT_VEHICLE', 2, {order: 10}, (event) => {
		if (event.gameId == mod.game.me.gameId) {
			const fakeMounted = mountSkill !== -1
			serverMounted = true
			mountSkill = event.skill
			if (fakeMounted) {
				return false
			}
		}
	})
	
	mod.hook('S_PLAYER_CHANGE_FLIGHT_ENERGY', 1, (event) => {
		outOfEnergy = (event.energy === 0)
	})
	
	mod.hook('S_SKILL_CATEGORY', 3, (event) => {
		if (event.category == CATEGORY_GLOBAL) {
			mountDisabled = !event.enabled
		}
	})
	
	mod.hook('S_UNMOUNT_VEHICLE', 2, {order: 10}, (event) => {
		if (event.gameId != mod.game.me.gameId) {
			return
		}
		serverMounted = false
		if (!location.flying || dismountByUser) {
			dismountByUser = false
			mountSkill = -1
		} else {
			clearTimeout(remountTimer)
			remountTimer = setTimeout(tryRemount, 50)
			return false
		}
	})
	
	mod.hook('S_USER_STATUS', 3, (event) => {
		if (event.gameId == mod.game.me.gameId) {
			inCombat = event.status == 1
		}
	})
	
	function tryRemount() {
		if (!mountDisabled && !inCombat) {
			mod.send('C_START_SKILL', 7, {
				skill: mountSkill,
				w: location.dir,
				loc: location.pos,
				unk: true
			})
			remountTimer = setTimeout(() => {
				if (!serverMounted) {
					mod.send('S_UNMOUNT_VEHICLE', 2, {
						gameId,
						skill: mountSkill
					})
					mountSkill = -1
				}
			}, 1000)
		} else {
			mod.send('S_UNMOUNT_VEHICLE', 2, {
				gameId,
				skill: mountSkill
			})
			mountSkill = -1
		}
	}
}
